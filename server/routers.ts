import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut, storageGet } from "./storage";
import { registerUser, loginUser } from "./auth";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(2),
      }))
      .mutation(async ({ input, ctx }) => {
        const { user, token } = await registerUser(input.email, input.password, input.name);
        
        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        
        return { user, success: true };
      }),
    
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { user, token } = await loginUser(input.email, input.password);
        
        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        
        return { user, success: true };
      }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  users: router({
    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return db.searchUsers(input.query);
      }),
    
    updateStatus: protectedProcedure
      .input(z.object({
        status: z.enum(["online", "offline", "away", "busy"]),
        customStatus: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserStatus(ctx.user.id, input.status, input.customStatus);
        return { success: true };
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getUserById(input.id);
      }),
  }),

  organizations: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        slug: z.string(),
        logoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const orgId = await db.createOrganization({
          name: input.name,
          slug: input.slug,
          logoUrl: input.logoUrl,
        });
        
        if (orgId) {
          await db.addOrgMember({
            orgId,
            userId: ctx.user.id,
            role: "owner",
          });
        }
        
        return { orgId };
      }),
    
    getMembers: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ input }) => {
        return db.getOrgMembers(input.orgId);
      }),
    
    addMember: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        userId: z.number(),
        role: z.enum(["owner", "admin", "member", "guest"]),
      }))
      .mutation(async ({ input }) => {
        await db.addOrgMember(input);
        return { success: true };
      }),
  }),

  chats: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserChats(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        isGroup: z.boolean(),
        name: z.string().optional(),
        memberIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const chatId = await db.createChat({
          orgId: input.orgId,
          isGroup: input.isGroup,
          name: input.name,
          createdBy: ctx.user.id,
        });
        
        if (chatId) {
          // Add creator
          await db.addChatMember({ chatId, userId: ctx.user.id });
          
          // Add other members
          for (const memberId of input.memberIds) {
            await db.addChatMember({ chatId, userId: memberId });
          }
        }
        
        return { chatId };
      }),
    
    getById: protectedProcedure
      .input(z.object({ chatId: z.number() }))
      .query(async ({ input }) => {
        return db.getChatById(input.chatId);
      }),
    
    getMembers: protectedProcedure
      .input(z.object({ chatId: z.number() }))
      .query(async ({ input }) => {
        return db.getChatMembers(input.chatId);
      }),
    
    getMessages: protectedProcedure
      .input(z.object({
        chatId: z.number(),
        limit: z.number().default(50),
        beforeId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return db.getChatMessages(input.chatId, input.limit, input.beforeId);
      }),
    
    sendMessage: protectedProcedure
      .input(z.object({
        chatId: z.number(),
        body: z.string(),
        replyToId: z.number().optional(),
        attachmentUrl: z.string().optional(),
        attachmentType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const messageId = await db.createMessage({
          chatId: input.chatId,
          senderId: ctx.user.id,
          body: input.body,
          replyToId: input.replyToId,
          attachmentUrl: input.attachmentUrl,
          attachmentType: input.attachmentType,
        });
        
        return { messageId };
      }),
    
    markAsRead: protectedProcedure
      .input(z.object({ chatId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateLastRead(input.chatId, ctx.user.id);
        return { success: true };
      }),
  }),

  files: router({
    upload: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        name: z.string(),
        mimeType: z.string(),
        size: z.number(),
        content: z.string(), // base64
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.content, 'base64');
        const storageKey = `files/${ctx.user.id}/${Date.now()}-${input.name}`;
        
        const { url } = await storagePut(storageKey, buffer, input.mimeType);
        
        const fileId = await db.createFile({
          orgId: input.orgId,
          ownerId: ctx.user.id,
          name: input.name,
          mimeType: input.mimeType,
          size: input.size,
          storageKey,
        });
        
        return { fileId, url };
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getFileById(input.id);
      }),
    
    list: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getUserFiles(ctx.user.id, input.orgId);
      }),
    
    getDownloadUrl: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const file = await db.getFileById(input.id);
        if (!file) throw new Error("File not found");
        
        const { url } = await storageGet(file.storageKey, 3600);
        return { url };
      }),
  }),

  notes: router({
    list: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        isPublic: z.boolean().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return db.getUserNotes(ctx.user.id, input.orgId, input.isPublic);
      }),
    
    create: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        title: z.string(),
        contentMarkdown: z.string().optional(),
        isPublic: z.boolean().default(false),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const noteId = await db.createNote({
          orgId: input.orgId,
          ownerId: ctx.user.id,
          title: input.title,
          contentMarkdown: input.contentMarkdown,
          isPublic: input.isPublic,
          tags: input.tags ? JSON.stringify(input.tags) : null,
        });
        
        if (noteId && input.contentMarkdown) {
          await db.createNoteVersion({
            noteId,
            version: 1,
            contentMarkdown: input.contentMarkdown,
            createdBy: ctx.user.id,
          });
        }
        
        return { noteId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        contentMarkdown: z.string().optional(),
        isPublic: z.boolean().optional(),
        isPinned: z.boolean().optional(),
        isFavorite: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        
        const note = await db.getNoteById(id);
        if (!note) throw new Error("Note not found");
        
        if (input.contentMarkdown && input.contentMarkdown !== note.contentMarkdown) {
          const versions = await db.getNoteVersions(id);
          const nextVersion = versions.length + 1;
          
          await db.createNoteVersion({
            noteId: id,
            version: nextVersion,
            contentMarkdown: input.contentMarkdown,
            createdBy: ctx.user.id,
          });
        }
        
        await db.updateNote(id, {
          ...updates,
          tags: input.tags ? JSON.stringify(input.tags) : undefined,
        });
        
        return { success: true };
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const note = await db.getNoteById(input.id);
        if (note && note.tags) {
          return { ...note, tags: JSON.parse(note.tags as string) };
        }
        return note;
      }),
    
    getVersions: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .query(async ({ input }) => {
        return db.getNoteVersions(input.noteId);
      }),
    
    search: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        query: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        return db.searchNotes(ctx.user.id, input.orgId, input.query);
      }),
  }),

  calendars: router({
    list: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getUserCalendars(ctx.user.id, input.orgId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        name: z.string(),
        visibility: z.enum(["private", "public"]),
        color: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const calendarId = await db.createCalendar({
          orgId: input.orgId,
          ownerId: ctx.user.id,
          name: input.name,
          visibility: input.visibility,
          color: input.color,
        });
        
        return { calendarId };
      }),
  }),

  events: router({
    list: protectedProcedure
      .input(z.object({
        calendarId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        return db.getCalendarEvents(input.calendarId, input.startDate, input.endDate);
      }),
    
    create: protectedProcedure
      .input(z.object({
        calendarId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        location: z.string().optional(),
        startsAt: z.date(),
        endsAt: z.date(),
        allDay: z.boolean().default(false),
        attendeeIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const eventId = await db.createEvent({
          calendarId: input.calendarId,
          title: input.title,
          description: input.description,
          location: input.location,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          allDay: input.allDay,
          createdBy: ctx.user.id,
        });
        
        if (eventId && input.attendeeIds) {
          for (const attendeeId of input.attendeeIds) {
            await db.addEventAttendee({
              eventId,
              userId: attendeeId,
              status: "pending",
            });
          }
        }
        
        return { eventId };
      }),
    
    updateAttendeeStatus: protectedProcedure
      .input(z.object({
        eventId: z.number(),
        status: z.enum(["pending", "accepted", "declined", "tentative"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateAttendeeStatus(input.eventId, ctx.user.id, input.status);
        return { success: true };
      }),
  }),

  appointments: router({
    list: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getAppointmentRequests(ctx.user.id, input.orgId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        inviteeIds: z.array(z.number()),
        proposedSlots: z.array(z.object({
          start: z.date(),
          end: z.date(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const appointmentId = await db.createAppointmentRequest({
          orgId: input.orgId,
          requesterId: ctx.user.id,
          title: input.title,
          description: input.description,
          proposedSlotsJson: JSON.stringify(input.proposedSlots),
        });
        
        if (appointmentId) {
          for (const inviteeId of input.inviteeIds) {
            await db.addAppointmentInvitee({
              appointmentId,
              userId: inviteeId,
            });
          }
        }
        
        return { appointmentId };
      }),
    
    confirm: protectedProcedure
      .input(z.object({
        id: z.number(),
        decidedSlot: z.date(),
      }))
      .mutation(async ({ input }) => {
        await db.updateAppointmentStatus(input.id, "confirmed", input.decidedSlot);
        return { success: true };
      }),
    
    decline: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateAppointmentStatus(input.id, "declined");
        return { success: true };
      }),
  }),

  availability: router({
    get: protectedProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const userId = input.userId ?? ctx.user.id;
        return db.getUserAvailability(userId);
      }),
    
    set: protectedProcedure
      .input(z.object({
        slots: z.array(z.object({
          dayOfWeek: z.number().min(0).max(6),
          startTime: z.string(),
          endTime: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const slots = input.slots.map(slot => ({
          userId: ctx.user.id,
          ...slot,
        }));
        
        await db.setUserAvailability(ctx.user.id, slots);
        return { success: true };
      }),
  }),

  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        return db.getUserNotifications(ctx.user.id, input.limit);
      }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),
    
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),
    
    subscribe: protectedProcedure
      .input(z.object({
        endpoint: z.string(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.addNotificationSubscription({
          userId: ctx.user.id,
          endpoint: input.endpoint,
          keysJson: JSON.stringify(input.keys),
        });
        return { success: true };
      }),
  }),

  audit: router({
    list: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        limit: z.number().default(100),
      }))
      .query(async ({ input }) => {
        return db.getAuditLogs(input.orgId, input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;

