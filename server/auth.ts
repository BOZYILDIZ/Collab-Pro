import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb, getUserById } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface AuthTokenPayload {
  userId: number;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export async function registerUser(email: string, password: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user already exists
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    throw new Error("Un utilisateur avec cet email existe déjà");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const result = await db.insert(users).values({
    email,
    password: hashedPassword,
    name,
    loginMethod: "email",
    role: "member",
  });

  const userId = Number(result[0].insertId);
  const user = await getUserById(userId);
  
  if (!user) throw new Error("Failed to create user");

  // Generate token
  const token = generateToken({ userId: user.id, email: user.email! });

  return { user, token };
}

export async function loginUser(email: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find user
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (result.length === 0) {
    throw new Error("Email ou mot de passe incorrect");
  }

  const user = result[0];

  // Verify password
  if (!user.password) {
    throw new Error("Ce compte n'a pas de mot de passe configuré");
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error("Email ou mot de passe incorrect");
  }

  // Update last signed in
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

  // Generate token
  const token = generateToken({ userId: user.id, email: user.email! });

  return { user, token };
}

export async function getUserFromToken(token: string) {
  const payload = verifyToken(token);
  if (!payload) return null;

  return getUserById(payload.userId);
}

