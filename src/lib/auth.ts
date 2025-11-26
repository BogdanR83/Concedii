import CryptoJS from 'crypto-js';

// Simple password hashing (in production, use a proper backend with bcrypt)
const SALT = 'concedii-app-salt-2024';

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password + SALT).toString();
}

export function verifyPassword(password: string, hash: string): boolean {
  const hashedPassword = hashPassword(password);
  return hashedPassword === hash;
}

