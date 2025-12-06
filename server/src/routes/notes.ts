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

    // メタデータ取得
    const metaResult = await docClient.send(
      new GetCommand({
        TableName: 'Notes',
        Key: { id },
      })
    );

    if (!metaResult.Item) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // コンテンツ取得
    const stream = await minioClient.getObject('jade-notes', id);
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const content = Buffer.concat(chunks).toString('utf-8');

    res.json({
      ...metaResult.Item,
      content,
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// ノート作成
noteRouter.post('/', async (req: Request, res: Response) => {
  try {
    console.log('📝 POST /api/notes - Creating new note');
    console.log('Request body:', req.body);
    
    const { title, content } = req.body;
    
    if (!title || !content) {
      console.error('❌ Missing title or content');
      return res.status(400).json({ error: 'Title and content are required' });
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

    // メタデータ更新
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

    // コンテンツ更新
    const buffer = Buffer.from(content, 'utf-8');
    await minioClient.putObject('jade-notes', id, buffer, buffer.length, {
      'Content-Type': 'text/markdown',
    });

    // 検索インデックス更新
    await elasticClient.update({
      index: 'notes',
      id,
      doc: {
        title,
        content,
        updatedAt: now,
      },
    });

    res.json({ id, title, updatedAt: now });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
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
