import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";

// Helper to check if user is admin
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // User Profile routes
  userProfile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserProfile(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        userType: z.enum(["tenant", "staff", "admin"]),
        phoneNumber: z.string().optional(),
        address: z.string().optional(),
        apartmentNumber: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createUserProfile({
          userId: ctx.user.id,
          userType: input.userType,
          phoneNumber: input.phoneNumber,
          address: input.address,
          apartmentNumber: input.apartmentNumber,
        });
      }),
  }),

  // Complaint Categories routes
  categories: router({
    list: publicProcedure.query(async () => {
      return await db.getComplaintCategories();
    }),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getComplaintCategoryById(input.id);
      }),
  }),

  // Complaint routes
  complaints: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return await db.getAllComplaints(input.limit, input.offset);
      }),
    listByTenant: protectedProcedure.query(async ({ ctx }) => {
      return await db.getComplaintsByTenant(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getComplaintById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        title: z.string().min(5).max(255),
        description: z.string().min(10),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        attachmentUrls: z.array(z.string()).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        const complaint = await db.createComplaint({
          tenantId: ctx.user.id,
          categoryId: input.categoryId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          attachmentUrls: input.attachmentUrls,
        });

        // Create audit log
        await db.createAuditLog({
          userId: ctx.user.id,
          action: "CREATE_COMPLAINT",
          entityType: "complaint",
          entityId: 0,
          changes: { title: input.title, categoryId: input.categoryId },
        });

        // Create notification for admins
        const dbInstance = await db.getDb();
        if (dbInstance) {
          const admins = await dbInstance.select().from(users).where(eq(users.role, "admin"));
          for (const admin of admins) {
            await db.createNotification({
              userId: admin.id,
              complaintId: undefined,
              title: "New Complaint Submitted",
              message: `New complaint: ${input.title}`,
              type: "system",
            });
          }
        }

        return complaint;
      }),
    updateStatus: adminProcedure
      .input(z.object({
        complaintId: z.number(),
        status: z.enum(["pending", "in_progress", "resolved", "rejected"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateComplaintStatus(input.complaintId, input.status);

        // Create notification for tenant
        const complaint = await db.getComplaintById(input.complaintId);
        if (complaint) {
          await db.createNotification({
            userId: complaint.tenantId,
            complaintId: input.complaintId,
            title: "Complaint Status Updated",
            message: `Your complaint status changed to: ${input.status}`,
            type: "status_update",
          });
        } else {
          throw new TRPCError({ code: "NOT_FOUND", message: "Complaint not found" });
        }

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "UPDATE_COMPLAINT_STATUS",
          entityType: "complaint",
          entityId: input.complaintId,
          changes: { status: input.status },
        });

        return { success: true };
      }),
  }),

  // Staff Assignment routes
  staffAssignments: router({
    listByStaff: protectedProcedure.query(async ({ ctx }) => {
      return await db.getStaffAssignmentsByStaff(ctx.user.id);
    }),
    getByComplaint: protectedProcedure
      .input(z.object({ complaintId: z.number() }))
      .query(async ({ input }) => {
        return await db.getStaffAssignmentByComplaint(input.complaintId);
      }),
    assign: adminProcedure
      .input(z.object({
        complaintId: z.number(),
        staffId: z.number(),
        deadline: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const assignment = await db.createStaffAssignment({
          complaintId: input.complaintId,
          staffId: input.staffId,
          assignedAt: new Date(),
          assignedBy: ctx.user.id,
          deadline: input.deadline,
        });

        // Notify staff member
        await db.createNotification({
          userId: input.staffId,
          complaintId: input.complaintId,
          title: "New Task Assigned",
          message: "You have been assigned a new complaint to handle",
          type: "assignment",
        });

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "ASSIGN_COMPLAINT",
          entityType: "staffAssignment",
          entityId: 0,
          changes: { staffId: input.staffId, complaintId: input.complaintId },
        });

        return assignment;
      }),
    updateProgress: protectedProcedure
      .input(z.object({
        assignmentId: z.number(),
        notes: z.string().optional(),
        proofUrls: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateStaffAssignment(input.assignmentId, {
          notes: input.notes,
          proofUrls: input.proofUrls,
        });

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "UPDATE_ASSIGNMENT",
          entityType: "staffAssignment",
          entityId: input.assignmentId,
          changes: { notes: input.notes },
        });

        return { success: true };
      }),
    markComplete: protectedProcedure
      .input(z.object({ assignmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateStaffAssignment(input.assignmentId, {
          completedAt: new Date(),
        });

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "COMPLETE_ASSIGNMENT",
          entityType: "staffAssignment",
          entityId: input.assignmentId,
          changes: { completedAt: new Date() },
        });

        return { success: true };
      }),
  }),

  // Feedback routes
  feedback: router({
    getByComplaint: protectedProcedure
      .input(z.object({ complaintId: z.number() }))
      .query(async ({ input }) => {
        return await db.getFeedbackByComplaint(input.complaintId);
      }),
    submit: protectedProcedure
      .input(z.object({
        complaintId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const fb = await db.createFeedback({
          complaintId: input.complaintId,
          tenantId: ctx.user.id,
          rating: input.rating,
          comment: input.comment,
        });

        await db.createAuditLog({
          userId: ctx.user.id,
          action: "SUBMIT_FEEDBACK",
          entityType: "feedback",
          entityId: 0,
          changes: { rating: input.rating },
        });

        return fb;
      }),
  }),

  // Notification routes
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        return await db.getUserNotifications(ctx.user.id, input.limit);
      }),
    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.notificationId);
        return { success: true };
      }),
  }),

  // Message routes
  messages: router({
    listByComplaint: protectedProcedure
      .input(z.object({ complaintId: z.number() }))
      .query(async ({ input }) => {
        return await db.getComplaintMessages(input.complaintId);
      }),
    send: protectedProcedure
      .input(z.object({
        complaintId: z.number(),
        receiverId: z.number(),
        content: z.string().min(1),
        attachmentUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createMessage({
          complaintId: input.complaintId,
          senderId: ctx.user.id,
          receiverId: input.receiverId,
          content: input.content,
          attachmentUrl: input.attachmentUrl,
        });

        // Create notification for receiver
        await db.createNotification({
          userId: input.receiverId,
          complaintId: input.complaintId,
          title: "New Message",
          message: "You have a new message",
          type: "system",
        });

        return { success: true };
      }),
  }),

  // Audit logs routes
  auditLogs: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return await db.getAuditLogs(input.limit, input.offset);
      }),
  }),
  
  // AI/Chat related routes
  ai: router({
    chat: protectedProcedure
      .input(z.object({ 
        messages: z.array(z.object({ 
          role: z.enum(["system", "user", "assistant"]), 
          content: z.string() 
        })) 
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./llm");
        const response = await invokeLLM(input.messages);
        return response;
      }),
  }),
});

export type AppRouter = typeof appRouter;
