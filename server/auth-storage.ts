import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if user exists by ID
    if (userData.id) {
      const existingById = await this.getUser(userData.id);
      if (existingById) {
        const [updated] = await db
          .update(users)
          .set({ ...userData, updatedAt: new Date() })
          .where(eq(users.id, userData.id))
          .returning();
        return updated;
      }
    }

    // Check if user exists by email
    if (userData.email) {
      const [existingByEmail] = await db.select().from(users).where(eq(users.email, userData.email));
      if (existingByEmail) {
        const [updated] = await db
          .update(users)
          .set({ ...userData, updatedAt: new Date() })
          .where(eq(users.email, userData.email))
          .returning();
        return updated;
      }
    }

    // Insert new user, handle race condition on email uniqueness
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    } catch (e: any) {
      if (e?.code === '23505' && userData.email) {
        const [existingByEmail] = await db.select().from(users).where(eq(users.email, userData.email));
        if (existingByEmail) {
          const { id: _ignoreId, ...mutableFields } = userData;
          const [updated] = await db
            .update(users)
            .set({ ...mutableFields, updatedAt: new Date() })
            .where(eq(users.email, userData.email))
            .returning();
          return updated;
        }
      }
      throw e;
    }
  }
}

export const authStorage = new AuthStorage();
