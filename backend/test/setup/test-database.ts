import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { execSync } from 'child_process';

let container: StartedPostgreSqlContainer;
let databaseUrl: string;

export async function startTestDatabase(): Promise<string> {
  // You can pin a version for consistency
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test_db')
    .withUsername('test')
    .withPassword('test')
    .start();

  databaseUrl = container.getConnectionUri();
  // Example: postgresql://test:test@localhost:32768/test_db

  // Apply migrations against the temporary database
  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: 'inherit',
  });

  return databaseUrl;
}

export async function stopTestDatabase(): Promise<void> {
  if (container) {
    await container.stop();
  }
}

export function getTestDatabaseUrl(): string {
  return databaseUrl;
}

