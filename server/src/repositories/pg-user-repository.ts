import type { UserRole } from '@inquirydesk/shared';
import type { DbPool } from '../db/pool';
import type { User, UserCredentials } from '../domain/user';
import type { UserRepository } from './user-repository';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  password_hash?: string;
}

const toUser = (row: UserRow): User => ({ id: row.id, name: row.name, email: row.email, role: row.role });

export class PgUserRepository implements UserRepository {
  constructor(private readonly db: DbPool) {}

  async findById(id: number): Promise<User | null> {
    const { rows } = await this.db.query<UserRow>('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    const { rows } = await this.db.query<UserRow>(
      'SELECT id, name, email, role, password_hash FROM users WHERE lower(email) = lower($1)',
      [email],
    );
    const row = rows[0];
    return row ? { ...toUser(row), passwordHash: row.password_hash! } : null;
  }

  async listStaff(): Promise<User[]> {
    const { rows } = await this.db.query<UserRow>('SELECT id, name, email, role FROM users ORDER BY name');
    return rows.map(toUser);
  }
}
