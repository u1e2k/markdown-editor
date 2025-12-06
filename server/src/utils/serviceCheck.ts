/**
 * サービス接続の事前チェック
 */
import { createConnection } from 'net';

async function checkPort(host: string, port: number, timeout = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeout);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

export async function checkServiceAvailability() {
  // Docker環境ではサービス名、ローカルではlocalhost
  const minioHost = process.env.MINIO_ENDPOINT || 'localhost';
  const dynamoHost = process.env.DYNAMODB_ENDPOINT?.includes('dynamodb') ? 'dynamodb' : 'localhost';
  const elasticHost = process.env.ELASTICSEARCH_ENDPOINT?.includes('elasticsearch') ? 'elasticsearch' : 'localhost';

  const checks = {
    minio: false,
    dynamodb: false,
    elasticsearch: false,
  };

  // MinIO チェック (ポート 9000)
  try {
    checks.minio = await checkPort(minioHost, parseInt(process.env.MINIO_PORT || '9000'));
  } catch {
    checks.minio = false;
  }

  // DynamoDB チェック (ポート 8000)
  try {
    checks.dynamodb = await checkPort(dynamoHost, 8000);
  } catch {
    checks.dynamodb = false;
  }

  // Elasticsearch チェック (ポート 9200)
  try {
    checks.elasticsearch = await checkPort(elasticHost, 9200);
  } catch {
    checks.elasticsearch = false;
  }

  return checks;
}

export function printServiceStatus(checks: Record<string, boolean>) {
  console.log('');
  console.log('📊 Service Status:');
  console.log(`  MinIO:         ${checks.minio ? '✅ Running' : '❌ Not available'}`);
  console.log(`  DynamoDB:      ${checks.dynamodb ? '✅ Running' : '❌ Not available'}`);
  console.log(`  Elasticsearch: ${checks.elasticsearch ? '✅ Running' : '❌ Not available'}`);
  console.log('');

  const allRunning = Object.values(checks).every(status => status);
  
  if (!allRunning) {
    console.log('⚠️  Some services are not running!');
    console.log('');
    console.log('💡 To start Docker services, run:');
    console.log('   cd /workspaces/markdown-editor');
    console.log('   docker compose up -d');
    console.log('');
    console.log('   Or from the server directory:');
    console.log('   bun run docker:up');
    console.log('');
  }

  return allRunning;
}
