import { eq, and, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, userProfiles, complaints, staffAssignments, feedback, notifications, auditLogs, messages, complaintCategories } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserProfile(profile: typeof userProfiles.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(userProfiles).values(profile);
}

// Complaint queries
export async function getComplaintById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getComplaintsByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(complaints).where(eq(complaints.tenantId, tenantId)).orderBy(desc(complaints.createdAt));
}

export async function getAllComplaints(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(complaints).orderBy(desc(complaints.createdAt)).limit(limit).offset(offset);
}

export async function createComplaint(complaint: typeof complaints.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(complaints).values(complaint);
  return result;
}

export async function updateComplaintStatus(complaintId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(complaints).set({ status: status as any, updatedAt: new Date() }).where(eq(complaints.id, complaintId));
}

// Staff assignment queries
export async function getStaffAssignmentsByStaff(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(staffAssignments).where(eq(staffAssignments.staffId, staffId)).orderBy(desc(staffAssignments.assignedAt));
}

export async function getStaffAssignmentByComplaint(complaintId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(staffAssignments).where(eq(staffAssignments.complaintId, complaintId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createStaffAssignment(assignment: typeof staffAssignments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(staffAssignments).values(assignment);
}

export async function updateStaffAssignment(assignmentId: number, updates: Partial<typeof staffAssignments.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(staffAssignments).set(updates).where(eq(staffAssignments.id, assignmentId));
}

// Feedback queries
export async function getFeedbackByComplaint(complaintId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(feedback).where(eq(feedback.complaintId, complaintId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createFeedback(fb: typeof feedback.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(feedback).values(fb);
}

// Notification queries
export async function getUserNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function createNotification(notif: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(notifications).values(notif);
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notificationId));
}

// Message queries
export async function getComplaintMessages(complaintId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(messages).where(eq(messages.complaintId, complaintId)).orderBy(asc(messages.createdAt));
}

export async function createMessage(msg: typeof messages.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(messages).values(msg);
}

// Audit log queries
export async function createAuditLog(log: typeof auditLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(auditLogs).values(log);
}

export async function getAuditLogs(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
}

// Complaint category queries
export async function getComplaintCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(complaintCategories).orderBy(asc(complaintCategories.name));
}

export async function getComplaintCategoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(complaintCategories).where(eq(complaintCategories.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
