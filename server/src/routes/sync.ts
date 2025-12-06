import { Router, Request, Response } from 'express';
import { minioClient } from '../services';
import crypto from 'crypto';

export const syncRouter = Router();

// ブロック署名構造体
interface BlockSignature {
  block_index: number;
  weak_checksum: number;
  strong_hash: string;
}

// デルタ命令
interface DeltaInstruction {
  Copy?: { block_index: number };
  Insert?: { data: number[] };
}

// Adler-32チェックサム計算
function adler32(data: Buffer): number {
  let a = 1;
  let b = 0;
  const MOD_ADLER = 65521;

  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % MOD_ADLER;
    b = (b + a) % MOD_ADLER;
  }

  return (b << 16) | a;
}

// MD5ハッシュ計算
function md5Hash(data: Buffer): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

// ブロック署名生成
function generateSignatures(content: Buffer, blockSize: number): BlockSignature[] {
  const signatures: BlockSignature[] = [];
  
  for (let i = 0; i < content.length; i += blockSize) {
    const end = Math.min(i + blockSize, content.length);
    const chunk = content.slice(i, end);
    
    signatures.push({
      block_index: Math.floor(i / blockSize),
      weak_checksum: adler32(chunk),
      strong_hash: md5Hash(chunk),
    });
  }
  
  return signatures;
}

// デルタ適用
function applyDelta(
  oldContent: Buffer,
  delta: { instructions: DeltaInstruction[] },
  blockSize: number
): Buffer {
  const chunks: Buffer[] = [];
  
  for (const instruction of delta.instructions) {
    if ('Copy' in instruction && instruction.Copy) {
      const blockIndex = instruction.Copy.block_index;
      const start = blockIndex * blockSize;
      const end = Math.min(start + blockSize, oldContent.length);
      chunks.push(oldContent.slice(start, end));
    } else if ('Insert' in instruction && instruction.Insert) {
      chunks.push(Buffer.from(instruction.Insert.data));
    }
  }
  
  return Buffer.concat(chunks);
}

// 署名生成エンドポイント
syncRouter.post('/signatures/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const blockSize = parseInt(req.query.blockSize as string) || 4096;

    // MinIOから古いコンテンツを取得
    const stream = await minioClient.getObject('jade-notes', id);
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const content = Buffer.concat(chunks);
    const signatures = generateSignatures(content, blockSize);

    res.json({ signatures, blockSize });
  } catch (error) {
    console.error('Error generating signatures:', error);
    res.status(500).json({ error: 'Failed to generate signatures' });
  }
});

// デルタ適用エンドポイント
syncRouter.post('/apply-delta/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { delta, blockSize } = req.body;

    // 古いコンテンツを取得
    const stream = await minioClient.getObject('jade-notes', id);
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const oldContent = Buffer.concat(chunks);
    
    // デルタを適用
    const newContent = applyDelta(oldContent, delta, blockSize || 4096);

    // 新しいコンテンツを保存
    await minioClient.putObject('jade-notes', id, newContent, newContent.length, {
      'Content-Type': 'text/markdown',
    });

    res.json({ 
      success: true, 
      originalSize: oldContent.length,
      newSize: newContent.length,
    });
  } catch (error) {
    console.error('Error applying delta:', error);
    res.status(500).json({ error: 'Failed to apply delta' });
  }
});
