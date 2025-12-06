import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { minioClient, docClient, elasticClient } from '../services';
import { PutCommand, GetCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Readable } from 'stream';

export const noteRouter = Router();

// ノート一覧取得
noteRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: 'Notes',
      })
    );

    res.json({ notes: result.Items || [] });
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

    // メタデータ取得
    console.log('Fetching metadata from DynamoDB...');
    const metaResult = await docClient.send(
      new GetCommand({
        TableName: 'Notes',
        Key: { id },
      })
    );

    if (!metaResult.Item) {
      console.log('❌ Note not found:', id);
      return res.status(404).json({ error: 'Note not found' });
    }
    console.log('✓ Metadata retrieved:', metaResult.Item);

    // コンテンツ取得
    console.log('Fetching content from MinIO...');
    const stream = await minioClient.getObject('jade-notes', id);
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const content = Buffer.concat(chunks).toString('utf-8');
    console.log('✓ Content retrieved, length:', content.length);

    const response = {
      ...metaResult.Item,
      content,
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
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    console.log('Generated ID:', id);

    // メタデータ保存
    console.log('Saving metadata to DynamoDB...');
    await docClient.send(
      new PutCommand({
        TableName: 'Notes',
        Item: {
          id,
          title,
          createdAt: now,
          updatedAt: now,
        },
      })
    );
    console.log('✓ Metadata saved');

    // コンテンツ保存
    console.log('Saving content to MinIO...');
    const buffer = Buffer.from(content, 'utf-8');
    await minioClient.putObject('jade-notes', id, buffer, buffer.length, {
      'Content-Type': 'text/markdown',
    });
    console.log('✓ Content saved');

    // 検索インデックス更新
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

    // メタデータ更新
    console.log('Updating metadata in DynamoDB...');
    await docClient.send(
      new PutCommand({
        TableName: 'Notes',
        Item: {
          id,
          title,
          updatedAt: now,
        },
      })
    );
    console.log('✓ Metadata updated');

    // コンテンツ更新
    console.log('Updating content in MinIO...');
    const buffer = Buffer.from(content, 'utf-8');
    await minioClient.putObject('jade-notes', id, buffer, buffer.length, {
      'Content-Type': 'text/markdown',
    });
    console.log('✓ Content updated');

    // 検索インデックス更新
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

    // メタデータ削除
    await docClient.send(
      new DeleteCommand({
        TableName: 'Notes',
        Key: { id },
      })
    );

    // コンテンツ削除
    await minioClient.removeObject('jade-notes', id);

    // 検索インデックス削除
    await elasticClient.delete({
      index: 'notes',
      id,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});
