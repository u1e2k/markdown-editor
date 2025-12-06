import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { noteRouter } from './routes/notes';
import { syncRouter } from './routes/sync';
import { searchRouter } from './routes/search';
import { initializeServices } from './services';
import { checkServiceAvailability, printServiceStatus } from './utils/serviceCheck';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ルート
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Jade API Server', 
    version: '1.0.0',
    endpoints: {
      health: '/health',
      notes: '/api/notes',
      sync: '/api/sync',
      search: '/api/search'
    }
  });
});

app.use('/api/notes', noteRouter);
app.use('/api/sync', syncRouter);
app.use('/api/search', searchRouter);

// ヘルスチェック
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// エラーハンドリングミドルウェア
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// サービス初期化
const startServer = async () => {
  try {
    console.log('🔍 Checking Docker services...');
    const serviceStatus = await checkServiceAvailability();
    const allServicesRunning = printServiceStatus(serviceStatus);
    
    if (!allServicesRunning) {
      console.log('⚠️  Warning: Continuing without all services. Some features may not work.');
      console.log('');
    }
    
    console.log('🔧 Initializing services...');
    await initializeServices();
    
    app.listen(PORT, () => {
      console.log('✅ Server started successfully!');
      console.log(`🚀 Jade API server running on port ${PORT}`);
      console.log(`📍 Server URL: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log('');
      console.log('Available endpoints:');
      console.log(`  GET    /api/notes          - List all notes`);
      console.log(`  GET    /api/notes/:id      - Get a specific note`);
      console.log(`  POST   /api/notes          - Create a new note`);
      console.log(`  PUT    /api/notes/:id      - Update a note`);
      console.log(`  DELETE /api/notes/:id      - Delete a note`);
      console.log(`  GET    /api/search?q=...   - Search notes`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('  1. Make sure Docker services are running: docker compose up -d');
    console.error('  2. Check if ports are available: lsof -i :8080');
    console.error('  3. Verify dependencies: bun install');
    process.exit(1);
  }
};

startServer();
