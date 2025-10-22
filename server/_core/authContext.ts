import { Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import { getUserFromToken } from "../auth";
import { User } from "../../drizzle/schema";

export async function getUserFromRequest(
  req: Request
): Promise<User | null> {
  // Try to get token from cookie
  const token = req.cookies[COOKIE_NAME];
  
  if (!token) {
    return null;
  }

  try {
    const user = await getUserFromToken(token);
    return user || null;
  } catch (error) {
    console.error("Error getting user from token:", error);
    return null;
  }
}

export interface AuthContext {
  req: Request;
  res: Response;
  user: User | null;
}

