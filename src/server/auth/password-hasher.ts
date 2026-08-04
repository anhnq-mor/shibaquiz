import { compare, hash } from "bcryptjs";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, passwordHash: string): Promise<boolean>;
}

export const DUMMY_PASSWORD_HASH =
  "$2b$12$Prx0CY6WloVzNJvHs5eFwuquuAdhkzLodh5lTgWEAo5iCbKx1.Ria";

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly cost: number) {}

  hash(password: string): Promise<string> {
    return hash(password, this.cost);
  }

  compare(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }
}
