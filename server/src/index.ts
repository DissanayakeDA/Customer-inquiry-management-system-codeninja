import { createApp } from './app';
import { loadConfig, loadDotEnv } from './config';
import { createContainer } from './container';

loadDotEnv();
const config = loadConfig();
const container = createContainer(config);
const app = createApp(container);

const server = app.listen(config.port, () => {
  console.log(`[api] InquiryDesk API listening on http://localhost:${config.port} (${config.env})`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[api] ${signal} received, shutting down`);
  server.close();
  await container.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
