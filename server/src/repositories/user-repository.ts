import type { User, UserCredentials } from '../domain/user';

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  /** Case-insensitive lookup including the password hash, for sign-in only. */
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;
  listStaff(): Promise<User[]>;
}
