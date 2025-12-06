import { Client } from 'minio';
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';

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

// Elasticsearch クライアント
export const elasticClient = new ElasticsearchClient({
  node: process.env.ELASTICSEARCH_ENDPOINT || 'http://localhost:9200',
});

// サービス初期化
export const initializeServices = async () => {
  try {
    // MinIO バケット作成
    const bucketName = 'jade-notes';
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName);
      console.log('✓ MinIO bucket created:', bucketName);
    }

    // DynamoDB テーブル作成
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
    } catch (error: any) {
      if (error.name !== 'ResourceInUseException') {
        throw error;
      }
    }

    // Elasticsearch インデックス作成
    const indexExists = await elasticClient.indices.exists({ index: 'notes' });
    if (!indexExists) {
      await elasticClient.indices.create({
        index: 'notes',
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: { type: 'text' },
              content: { type: 'text' },
              updatedAt: { type: 'date' },
            },
          },
        },
      });
      console.log('✓ Elasticsearch index created: notes');
    }

    console.log('✓ All services initialized successfully');
  } catch (error) {
    console.error('Error initializing services:', error);
    throw error;
  }
};
