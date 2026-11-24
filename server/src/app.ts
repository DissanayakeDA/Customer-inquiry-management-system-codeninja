import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AppContainer } from './container';
import { apiNotFound, errorHandler } from './http/middleware/error-handler';
import { buildApiRouter } from './http/routes';

/** Builds the Express app from already-wired dependencies, so tests can create it without listening on a port. */
export function createApp(container: AppContainer): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());

  app.use('/api', buildApiRouter(container));
  app.use('/api', apiNotFound);
  app.use(errorHandler());

  return app;
}
