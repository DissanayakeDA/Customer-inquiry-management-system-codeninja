import type { InquiryStatus, UserRole } from '@inquirydesk/shared';
import type { PasswordHasher } from '../security/password-hasher';
import type { DbPool } from './pool';

export const SEED_PASSWORD = 'Password123!';

export interface SeedUser {
  name: string;
  email: string;
  role: UserRole;
}

/** Inserted in this order, so ids are 1, 2, 3. */
export const SEED_USERS: readonly SeedUser[] = [
  { name: 'Nimal Perera', email: 'nimal@inquirydesk.test', role: 'admin' },
  { name: 'Ayesha Fernando', email: 'ayesha@inquirydesk.test', role: 'agent' },
  { name: 'Kasun Silva', email: 'kasun@inquirydesk.test', role: 'agent' },
];

interface SeedInquiry {
  customerName: string;
  contact: string;
  subject: string;
  description: string;
  status: InquiryStatus;
  createdBy: string;
  assignedTo: string | null;
  version: number;
  createdHoursAgo: number;
  updatedHoursAgo: number;
}

const H = 1;
const D = 24;

/** Oldest first, so the newest inquiry gets the highest id. */
const SEED_INQUIRIES: readonly SeedInquiry[] = [
  { customerName: 'Hiruni Senanayake', contact: 'hiruni.s@gmail.com', subject: 'Allergy information request', description: 'Asked whether flavoured blends contain nut extracts.', status: 'resolved', createdBy: 'ayesha', assignedTo: 'ayesha', version: 3, createdHoursAgo: 9 * D, updatedHoursAgo: 8 * D },
  { customerName: 'Isuru Kumara', contact: 'isuru.k@yahoo.com', subject: 'Invoice address correction', description: 'Company name on the invoice is wrong. Needs a corrected invoice for accounting.', status: 'new', createdBy: 'nimal', assignedTo: null, version: 1, createdHoursAgo: 6 * D, updatedHoursAgo: 6 * D },
  { customerName: 'Nadeesha Herath', contact: '+94 76 555 0199', subject: 'Machine descaling instructions', description: 'Asked how often to descale the espresso machine and which product to use.', status: 'resolved', createdBy: 'kasun', assignedTo: 'kasun', version: 3, createdHoursAgo: 6 * D, updatedHoursAgo: 5 * D },
  { customerName: 'Chamara Gunawardena', contact: 'chamara@lankatech.lk', subject: 'Corporate gifting quote', description: 'Needs 120 gift boxes for a year-end corporate event. Asked for a quote with custom branding.', status: 'in_progress', createdBy: 'kasun', assignedTo: 'kasun', version: 2, createdHoursAgo: 4 * D, updatedHoursAgo: 3 * D },
  { customerName: 'Malsha De Silva', contact: 'malsha.ds@gmail.com', subject: 'Subscription pause', description: 'Travelling for 6 weeks, wants to pause the monthly subscription instead of cancelling.', status: 'new', createdBy: 'ayesha', assignedTo: 'ayesha', version: 1, createdHoursAgo: 3 * D, updatedHoursAgo: 3 * D },
  { customerName: 'Tharindu Rajapaksa', contact: '+94 71 987 6543', subject: 'Wrong item delivered', description: 'Received medium roast instead of dark roast. Wants an exchange.', status: 'resolved', createdBy: 'ayesha', assignedTo: 'ayesha', version: 4, createdHoursAgo: 3 * D, updatedHoursAgo: 2 * D },
  { customerName: 'Sachini Wickramasinghe', contact: 'sachini.w@outlook.com', subject: 'Refund not received', description: 'Returned a damaged grinder on the 3rd. Refund confirmation was sent but the money has not arrived.', status: 'in_progress', createdBy: 'kasun', assignedTo: 'ayesha', version: 2, createdHoursAgo: 2 * D, updatedHoursAgo: 1 * D },
  { customerName: 'Ruwan Bandara', contact: '+94 77 123 4567', subject: 'Request for bulk pricing', description: 'Runs a café chain (4 outlets). Wants pricing for monthly bulk orders of 40kg coffee beans.', status: 'in_progress', createdBy: 'ayesha', assignedTo: 'ayesha', version: 3, createdHoursAgo: 1 * D, updatedHoursAgo: 5 * H },
  { customerName: 'Dilani Jayasuriya', contact: 'dilani.j@gmail.com', subject: 'Delivery delayed for order #5521', description: 'Customer ordered on Monday and was promised delivery within 2 days. Still not received. Requests an update and an expected date.', status: 'new', createdBy: 'ayesha', assignedTo: null, version: 1, createdHoursAgo: 2 * H, updatedHoursAgo: 2 * H },
];

/** Replaces all users (and therefore all inquiries) with the seed accounts. Returns email → id. */
export async function seedUsers(pool: DbPool, hasher: PasswordHasher): Promise<Map<string, number>> {
  await pool.query('TRUNCATE inquiries, users RESTART IDENTITY CASCADE');
  const passwordHash = await hasher.hash(SEED_PASSWORD);
  const ids = new Map<string, number>();
  for (const user of SEED_USERS) {
    const { rows } = await pool.query<{ id: number }>(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [user.name, user.email, passwordHash, user.role],
    );
    ids.set(user.email, rows[0]!.id);
  }
  return ids;
}

/** Development seed: the three staff accounts plus a realistic spread of inquiries. */
export async function seedDemoData(pool: DbPool, hasher: PasswordHasher): Promise<void> {
  const ids = await seedUsers(pool, hasher);
  const idOf = (handle: string) => ids.get(`${handle}@inquirydesk.test`)!;

  for (const inquiry of SEED_INQUIRIES) {
    const createdBy = idOf(inquiry.createdBy);
    const assignedTo = inquiry.assignedTo ? idOf(inquiry.assignedTo) : null;
    await pool.query(
      `INSERT INTO inquiries
         (customer_name, contact, subject, description, status, created_by, assigned_to, updated_by,
          version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
               now() - make_interval(hours => $10), now() - make_interval(hours => $11))`,
      [
        inquiry.customerName, inquiry.contact, inquiry.subject, inquiry.description, inquiry.status,
        createdBy, assignedTo, assignedTo ?? createdBy, inquiry.version,
        inquiry.createdHoursAgo, inquiry.updatedHoursAgo,
      ],
    );
  }
}
