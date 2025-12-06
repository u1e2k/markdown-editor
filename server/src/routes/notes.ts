import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { minioClient, docClient, elasticClient } from '../services';
import { PutCommand, GetCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Readable } from 'stream';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export const noteRouter = Router();

const VAULT_PATH = process.env.VAULT_PATH || path.join(process.cwd(), '../vault');

// vaultフォルダの初期化
const ensureVaultExists = async () => {
  try {
    await fs.access(VAULT_PATH);
  } catch {
    await fs.mkdir(VAULT_PATH, { recursive: true });
  }
};

// ノート一覧取得
noteRouter.get('/', async (req: Request, res: Response) => {
  try {
    await ensureVaultExists();
    const files = await fs.readdir(VAULT_PATH);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    const notes = await Promise.all(
      mdFiles.map(async (filename) => {
        const filepath = path.join(VAULT_PATH, filename);
        const content = await fs.readFile(filepath, 'utf-8');
        const { data, content: body } = matter(content);
        const stats = await fs.stat(filepath);
        
        const id = filename.replace('.md', '');
        return {
          id,
          title: data.title || filename.replace('.md', ''),
          createdAt: data.createdAt || stats.birthtime.toISOString(),
          updatedAt: data.updatedAt || stats.mtime.toISOString(),
          ...data
        };
      })
    );

    res.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// ノート取得
noteRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('📖 GET /api/notes/:id - Fetching note:', id);

    const filepath = path.join(VAULT_PATH, `${id}.md`);
    
    try {
      await fs.access(filepath);
    } catch {
      console.log('❌ Note not found:', id);
      return res.status(404).json({ error: 'Note not found' });
    }

    const fileContent = await fs.readFile(filepath, 'utf-8');
    const { data, content } = matter(fileContent);
    const stats = await fs.stat(filepath);

    const response = {
      id,
      title: data.title || id,
      content,
      createdAt: data.createdAt || stats.birthtime.toISOString(),
      updatedAt: data.updatedAt || stats.mtime.toISOString(),
      ...data
    };
    
    console.log('✅ Returning note with content length:', response.content?.length);
    res.json(response);
  } catch (error) {
    console.error('❌ Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// ノート作成
noteRouter.post('/', async (req: Request, res: Response) => {
  try {
    console.log('📝 POST /api/notes - Creating new note');
    console.log('Request body:', req.body);
    
    const { title, content = '' } = req.body;
    
    console.log('📄 Content being saved:');
    console.log('---START---');
    console.log(content);
    console.log('---END---');
    console.log('Content length:', content.length);
    
    if (!title) {
      console.error('❌ Missing title');
      return res.status(400).json({ error: 'Title is required' });
    }
    
    await ensureVaultExists();
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    console.log('Generated ID:', id);

    // frontmatterとコンテンツを結合
    const frontmatter = {
      title,
      createdAt: now,
      updatedAt: now
    };
    
    const fileContent = matter.stringify(content, frontmatter);
    const filepath = path.join(VAULT_PATH, `${id}.md`);
    
    console.log('Saving to vault...');
    await fs.writeFile(filepath, fileContent, 'utf-8');
    console.log('✓ File saved');

    // 検索インデックス更新（エラーは無視）
    try {
      console.log('Updating search index...');
      await elasticClient.index({
        index: 'notes',
        id,
        document: {
          id,
          title,
          content,
          updatedAt: now,
        },
      });
      console.log('✓ Search index updated');
    } catch (err) {
      console.warn('⚠️  Search index update failed:', err);
    }

    console.log('✅ Note created successfully:', id);
    res.status(201).json({ id, title, createdAt: now, updatedAt: now });
  } catch (error) {
    console.error('❌ Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note', details: error instanceof Error ? error.message : String(error) });
  }
});

// ノート更新
noteRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const now = new Date().toISOString();

    console.log('📝 PUT /api/notes/:id - Updating note:', id);
    console.log('Title:', title);
    console.log('Content length:', content?.length || 0);

    const filepath = path.join(VAULT_PATH, `${id}.md`);
    
    // 既存のfrontmatterを読み込み
    let existingData: any = {};
    try {
      const existing = await fs.readFile(filepath, 'utf-8');
      const parsed = matter(existing);
      existingData = parsed.data;
    } catch {
      // ファイルが存在しない場合は新規作成
    }

    // frontmatterを更新
    const frontmatter = {
      ...existingData,
      title,
      updatedAt: now,
      createdAt: existingData.createdAt || now
    };
    
    const fileContent = matter.stringify(content, frontmatter);
    
    console.log('Updating file in vault...');
    await fs.writeFile(filepath, fileContent, 'utf-8');
    console.log('✓ File updated');

    // 検索インデックス更新（エラーは無視）
    try {
      console.log('Updating search index...');
      await elasticClient.update({
        index: 'notes',
        id,
        doc: {
          title,
          content,
          updatedAt: now,
        },
      });
      console.log('✓ Search index updated');
    } catch (err) {
      console.warn('⚠️  Search index update failed:', err);
    }

    console.log('✅ Note updated successfully:', id);
    res.json({ id, title, updatedAt: now });
  } catch (error) {
    console.error('❌ Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note', details: error instanceof Error ? error.message : String(error) });
  }
});

// ノート削除
noteRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const filepath = path.join(VAULT_PATH, `${id}.md`);
    
    console.log('Deleting file from vault...');
    await fs.unlink(filepath);
    console.log('✓ File deleted');

    // 検索インデックス削除（エラーは無視）
    try {
      await elasticClient.delete({
        index: 'notes',
        id,
      });
      console.log('✓ Search index deleted');
    } catch (err) {
      console.warn('⚠️  Search index delete failed:', err);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// マークダウンファイルのインポート
noteRouter.post('/import', async (req: Request, res: Response) => {
  try {
    console.log('📥 POST /api/notes/import - Importing markdown files');
    
    const { files } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    await ensureVaultExists();
    
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        // ファイル名から拡張子を除いた名前を取得
        const originalName = file.name.replace(/\.md$/i, '');
        
        // ファイル内容を解析
        const fileContent = file.content;
        const { data, content } = matter(fileContent);
        
        // IDを生成（既存のIDがあればそれを使用、なければUUID）
        const id = data.id || uuidv4();
        const filepath = path.join(VAULT_PATH, `${id}.md`);
        
        // 既存ファイルチェック
        try {
          await fs.access(filepath);
          console.log(`⚠️  File already exists, skipping: ${originalName}`);
          skipped++;
          continue;
        } catch {
          // ファイルが存在しない場合は作成
        }
        
        const now = new Date().toISOString();
        
        // フロントマターを構築（既存のメタデータを保持）
        const frontmatter = {
          title: data.title || originalName,
          createdAt: data.createdAt || now,
          updatedAt: data.updatedAt || now,
          ...data, // その他のメタデータも保持
        };
        
        // ファイルを保存
        const finalContent = matter.stringify(content, frontmatter);
        await fs.writeFile(filepath, finalContent, 'utf-8');
        
        // 検索インデックスに追加（エラーは無視）
        try {
          await elasticClient.index({
            index: 'notes',
            id,
            document: {
              id,
              title: frontmatter.title,
              content,
              updatedAt: frontmatter.updatedAt,
            },
          });
        } catch (err) {
          console.warn(`⚠️  Search index failed for ${originalName}:`, err);
        }
        
        console.log(`✅ Imported: ${originalName} (${id})`);
        imported++;
        
      } catch (error) {
        const errorMsg = `Failed to import ${file.name}: ${error instanceof Error ? error.message : String(error)}`;
        console.error('❌', errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`📊 Import summary: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);
    
    res.json({
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${imported} notes${skipped > 0 ? `, skipped ${skipped} existing files` : ''}`,
    });
    
  } catch (error) {
    console.error('❌ Error importing notes:', error);
    res.status(500).json({ 
      error: 'Failed to import notes', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});
