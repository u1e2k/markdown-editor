import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { noteRouter } from './routes/notes';
import { syncRouter } from './routes/sync';
import { searchRouter } from './routes/search';
import { initializeServices } from './services';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ルート
app.use('/api/notes', noteRouter);
app.use('/api/sync', syncRouter);
app.use('/api/search', searchRouter);

// ヘルスチェック
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// サービス初期化
const startServer = async () => {
  try {
    await initializeServices();
    app.listen(PORT, () => {
      console.log(`🚀 Jade API server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
