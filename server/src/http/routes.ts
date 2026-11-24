import { Router } from 'express';
import type { AppContainer } from '../container';
import { AuthController } from './controllers/auth-controller';
import { DashboardController } from './controllers/dashboard-controller';
import { InquiryController } from './controllers/inquiry-controller';
import { StaffController } from './controllers/staff-controller';
import { authenticate } from './middleware/authenticate';

export function buildApiRouter(container: AppContainer): Router {
  const auth = new AuthController(container.authService, container.sessionCookie);
  const inquiries = new InquiryController(container.inquiryService);
  const dashboard = new DashboardController(container.dashboardService);
  const staff = new StaffController(container.userRepository);

  const router = Router();

  // ---- public
  router.get('/health', async (_req, res) => {
    await container.pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });
  router.post('/auth/login', auth.login);
  router.post('/auth/logout', auth.logout);

  // ---- everything below requires a valid session
  router.use(authenticate(container.authService, container.sessionCookie));

  router.get('/auth/me', auth.me);
  router.get('/users', staff.list);
  router.get('/dashboard', dashboard.get);

  router.get('/inquiries', inquiries.list);
  router.post('/inquiries', inquiries.create);
  router.get('/inquiries/:id', inquiries.get);
  router.patch('/inquiries/:id/status', inquiries.changeStatus);
  router.patch('/inquiries/:id/assignee', inquiries.assign);

  return router;
}
