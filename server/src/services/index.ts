import { Client } from 'minio';
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Elasticsearch用の簡易クライアント（Bun互換）
const ELASTICSEARCH_ENDPOINT = process.env.ELASTICSEARCH_ENDPOINT || 'http://localhost:9200';

export const elasticClient = {
  async index(params: { index: string; id: string; document: any }) {
    const response = await fetch(`${ELASTICSEARCH_ENDPOINT}/${params.index}/_doc/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params.document),
    });
    if (!response.ok) {
      throw new Error(`Elasticsearch index failed: ${response.statusText}`);
    }
    return response.json();
  },
  
  async update(params: { index: string; id: string; doc: any }) {
    const response = await fetch(`${ELASTICSEARCH_ENDPOINT}/${params.index}/_update/${params.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc: params.doc }),
    });
    if (!response.ok) {
      throw new Error(`Elasticsearch update failed: ${response.statusText}`);
    }
    return response.json();
  },
  
  async search(params: { index: string; body?: any; query?: any; size?: number }) {
    const body = params.body || params;
    const response = await fetch(`${ELASTICSEARCH_ENDPOINT}/${params.index}/_search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Elasticsearch search failed: ${response.statusText}`);
    }
    return response.json();
  },
  
  async delete(params: { index: string; id: string }) {
    const response = await fetch(`${ELASTICSEARCH_ENDPOINT}/${params.index}/_doc/${params.id}`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Elasticsearch delete failed: ${response.statusText}`);
    }
    return response.json();
  },
  
  indices: {
    async create(params: { index: string; mappings: any }) {
      const response = await fetch(`${ELASTICSEARCH_ENDPOINT}/${params.index}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: params.mappings }),
      });
      const data = await response.json();
      if (!response.ok) {
        const error: any = new Error(`Elasticsearch create index failed: ${response.statusText}`);
        error.meta = { body: { error: (data as any).error } };
        throw error;
      }
      return data;
    },
  },
};

// MinIO クライアント
export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

// DynamoDB クライアント
const dynamoClient = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  region: 'local',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});

export const docClient = DynamoDBDocumentClient.from(dynamoClient);

// サービス初期化
export const initializeServices = async () => {
  const errors: string[] = [];
  
  try {
    // MinIO バケット作成
    console.log('🔧 Checking MinIO...');
    try {
      const bucketName = 'jade-notes';
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) {
        await minioClient.makeBucket(bucketName);
        console.log('✓ MinIO bucket created:', bucketName);
      } else {
        console.log('✓ MinIO bucket already exists:', bucketName);
      }
    } catch (error: any) {
      console.error('❌ MinIO connection failed:', error.message);
      errors.push(`MinIO: ${error.message}`);
    }

    // DynamoDB テーブル作成
    console.log('🔧 Checking DynamoDB...');
    try {
      // リトライロジック付きでテーブル作成を試みる
      let retries = 5;
      let lastError: any;
      
      while (retries > 0) {
        try {
          await dynamoClient.send(
            new CreateTableCommand({
              TableName: 'Notes',
              KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
              AttributeDefinitions: [
                { AttributeName: 'id', AttributeType: 'S' },
              ],
              BillingMode: 'PAY_PER_REQUEST',
            })
          );
          console.log('✓ DynamoDB table created: Notes');
          break;
        } catch (error: any) {
          if (error.name === 'ResourceInUseException') {
            console.log('✓ DynamoDB table already exists: Notes');
            break;
          }
          
          lastError = error;
          retries--;
          
          if (retries > 0) {
            console.log(`  Retrying DynamoDB connection... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (retries === 0) {
        throw lastError;
      }
    } catch (error: any) {
      console.error('❌ DynamoDB connection failed:', error.message);
      errors.push(`DynamoDB: ${error.message}`);
    }

    // Elasticsearch インデックス作成
    console.log('🔧 Checking Elasticsearch...');
    try {
      // リトライロジック付きでインデックス作成を試みる
      let retries = 5;
      let lastError: any;
      
      while (retries > 0) {
        try {
          // 直接インデックス作成を試みる（既存の場合はエラーで検知）
          await elasticClient.indices.create({
            index: 'notes',
            mappings: {
              properties: {
                id: { type: 'keyword' },
                title: { type: 'text' },
                content: { type: 'text' },
                updatedAt: { type: 'date' },
              },
            },
          });
          console.log('✓ Elasticsearch index created: notes');
          break;
        } catch (error: any) {
          // インデックスが既に存在する場合
          if (error.meta?.body?.error?.type === 'resource_already_exists_exception') {
            console.log('✓ Elasticsearch index already exists: notes');
            break;
          }
          
          lastError = error;
          retries--;
          
          if (retries > 0) {
            console.log(`  Retrying Elasticsearch connection... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (retries === 0) {
        throw lastError;
      }
    } catch (error: any) {
      console.error('❌ Elasticsearch connection failed:', error.message || String(error));
      errors.push(`Elasticsearch: ${error.message || String(error)}`);
    }

    if (errors.length > 0) {
      console.error('');
      console.error('⚠️  Some services failed to initialize:');
      errors.forEach(err => console.error('   -', err));
      console.error('');
      console.error('💡 To fix this, run: docker compose up -d');
      throw new Error('Service initialization failed. See errors above.');
    }

    console.log('');
    console.log('✅ All services initialized successfully');
    console.log('');
  } catch (error) {
    if (errors.length === 0) {
      console.error('❌ Unexpected error during service initialization:', error);
    }
    throw error;
  }
};
