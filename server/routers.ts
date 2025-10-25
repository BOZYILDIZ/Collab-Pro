import { z } from "zod";
import { randomBytes } from "crypto";
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
    list: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ input }) => {
        // Get all users from the organization
        const orgMembers = await db.getOrgMembers(input.orgId);
        return orgMembers;
      }),
    
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
    
    updateProfile: protectedProcedure
      .input(z.object({
        displayName: z.string().optional(),
        email: z.string().email().optional(),
        avatarUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
    
    updatePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserPassword(ctx.user.id, input.currentPassword, input.newPassword);
        return { success: true };
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
    
    templates: protectedProcedure
      .query(async () => {
        return db.getNoteTemplates();
      }),
    
    getTemplate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getNoteTemplate(input.id);
      }),
    
    delete: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteNote(input.noteId);
        return { success: true };
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
        targetUserId: z.number(),
        proposedSlotsJson: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const appointmentId = await db.createAppointmentRequest({
          orgId: input.orgId,
          requesterId: ctx.user.id,
          title: input.title,
          description: input.description,
          proposedSlotsJson: input.proposedSlotsJson,
        });
        
        if (appointmentId) {
          await db.addAppointmentInvitee({
            appointmentId,
            userId: input.targetUserId,
          });
        }
        
        return { appointmentId };
      }),
    
    confirm: protectedProcedure
      .input(z.object({
        id: z.number(),
        decidedSlot: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Mettre à jour le statut du rendez-vous
        await db.updateAppointmentStatus(input.id, "confirmed", input.decidedSlot);
        
        // Récupérer les détails du rendez-vous
        const appointment = await db.getAppointmentById(input.id);
        if (!appointment) throw new Error("Appointment not found");
        
        // Récupérer le calendrier par défaut de l'utilisateur
        const calendars = await db.getUserCalendars(ctx.user.id, appointment.orgId);
        let calendarId = calendars.find(c => c.name === "Mon Calendrier")?.id;
        
        // Si pas de calendrier, en créer un
        if (!calendarId) {
          const newCalendarId = await db.createCalendar({
            orgId: appointment.orgId,
            ownerId: ctx.user.id,
            name: "Mon Calendrier",
            visibility: "private",
            color: "#3B82F6",
          });
          calendarId = newCalendarId || undefined;
        }
        
        // Créer l'événement dans l'agenda
        if (calendarId) {
          const endTime = new Date(input.decidedSlot.getTime() + 60 * 60 * 1000); // 1 heure par défaut
          await db.createEvent({
            calendarId,
            title: appointment.title,
            description: appointment.description || undefined,
            startsAt: input.decidedSlot,
            endsAt: endTime,
            createdBy: ctx.user.id,
          });
        }
        
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

  // ============ PROJECT MANAGEMENT ============
  
  projects: router({
    list: protectedProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectsByOrg(input.orgId);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        visibility: z.enum(["private", "team", "public"]).default("team"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const projectId = await db.createProject({
          ...input,
          ownerId: ctx.user!.id,
          status: "active",
        });
        
        await db.addProjectMember({
          projectId,
          userId: ctx.user!.id,
          role: "owner",
        });
        
        return { id: projectId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        visibility: z.enum(["private", "team", "public"]).optional(),
        status: z.enum(["active", "archived", "completed"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProject(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProject(input.id);
        return { success: true };
      }),
    
    getMembers: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectMembers(input.projectId);
      }),
    
    addMember: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        userId: z.number(),
        role: z.enum(["owner", "admin", "member", "viewer"]).default("member"),
      }))
      .mutation(async ({ input }) => {
        const id = await db.addProjectMember(input);
        return { id };
      }),
    
    removeMember: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.removeProjectMember(input.projectId, input.userId);
        return { success: true };
      }),
  }),
  
  tasks: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getTasksByProject(input.projectId);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getTaskById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        parentTaskId: z.number().optional(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        status: z.string().default("todo"),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        assigneeId: z.number().optional(),
        dueDate: z.date().optional(),
        startDate: z.date().optional(),
        estimatedHours: z.number().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const taskId = await db.createTask({
          ...input,
          reporterId: ctx.user!.id,
        });
        return { id: taskId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assigneeId: z.number().optional(),
        dueDate: z.date().optional(),
        startDate: z.date().optional(),
        estimatedHours: z.number().optional(),
        actualHours: z.number().optional(),
        tags: z.string().optional(),
        position: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTask(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTask(input.id);
        return { success: true };
      }),
    
    getSubtasks: protectedProcedure
      .input(z.object({ parentTaskId: z.number() }))
      .query(async ({ input }) => {
        return db.getSubtasks(input.parentTaskId);
      }),
    
    addComment: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createTaskComment({
          ...input,
          userId: ctx.user!.id,
        });
        return { id };
      }),
    
    getComments: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        return db.getTaskComments(input.taskId);
      }),
  }),
  
  sprints: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getSprintsByProject(input.projectId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().min(1).max(255),
        goal: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createSprint(input);
        return { id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        goal: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        status: z.enum(["planned", "active", "completed"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSprint(id, data);
        return { success: true };
      }),
  }),
  
  search: router({
    global: protectedProcedure
      .input(z.object({
        query: z.string().min(1),
        types: z.array(z.enum(["notes", "tasks", "messages", "events", "users"])).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { query, types } = input;
        const searchTypes = types || ["notes", "tasks", "messages", "events", "users"];
        const results: any = {
          notes: [],
          tasks: [],
          messages: [],
          events: [],
          users: [],
        };

        // Search notes
        if (searchTypes.includes("notes")) {
          results.notes = await db.searchNotes(ctx.user.id, 1, query);
        }

        // Search tasks
        if (searchTypes.includes("tasks")) {
          const userProjects = await db.getUserProjects(ctx.user.id, 1);
          const allTasks: any[] = [];
          for (const project of userProjects) {
            const projectTasks = await db.getTasksByProject(project.id);
            allTasks.push(...projectTasks);
          }
          results.tasks = allTasks.filter((task: any) =>
            (task.title && task.title.toLowerCase().includes(query.toLowerCase())) ||
            (task.description && task.description.toLowerCase().includes(query.toLowerCase()))
          ).slice(0, 20);
        }

        // Search messages
        if (searchTypes.includes("messages")) {
          const userChats = await db.getUserChats(ctx.user.id);
          const allMessages: any[] = [];
          for (const chat of userChats) {
            const messages = await db.getChatMessages(chat.chat.id);
            allMessages.push(...messages.filter((msg: any) =>
              msg.message.content.toLowerCase().includes(query.toLowerCase())
            ));
          }
          results.messages = allMessages.slice(0, 20);
        }

        // Search events
        if (searchTypes.includes("events")) {
          const userCalendars = await db.getUserCalendars(ctx.user.id, 1);
          const allEvents: any[] = [];
          for (const calendar of userCalendars) {
            const events = await db.getCalendarEvents(calendar.id);
            allEvents.push(...events.filter((event: any) =>
              event.title.toLowerCase().includes(query.toLowerCase()) ||
              (event.description && event.description.toLowerCase().includes(query.toLowerCase()))
            ));
          }
          results.events = allEvents.slice(0, 20);
        }

        // Search users
        if (searchTypes.includes("users")) {
          results.users = await db.searchUsers(query);
        }

        return results;
      }),
  }),

  // Invitations
  invitations: router({
    create: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        email: z.string().email(),
        role: z.enum(["member", "admin", "guest"]).default("member"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Generate unique token
        const token = randomBytes(32).toString('hex');
        
        // Set expiration to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        const invitationId = await db.createInvitation({
          orgId: input.orgId,
          email: input.email,
          token,
          role: input.role,
          invitedBy: ctx.user.id,
          status: "pending",
          expiresAt,
        });
        
        return {
          id: invitationId,
          token,
          inviteUrl: `${process.env.APP_URL || 'http://localhost:3000'}/register?token=${token}`,
        };
      }),

    list: protectedProcedure
      .input(z.object({
        orgId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getInvitationsByOrg(input.orgId);
      }),

    verify: publicProcedure
      .input(z.object({
        token: z.string(),
      }))
      .query(async ({ input }) => {
        const invitation = await db.getInvitationByToken(input.token);
        
        if (!invitation) {
          throw new Error("Invitation invalide");
        }
        
        if (invitation.status !== "pending") {
          throw new Error("Cette invitation a déjà été utilisée ou révoquée");
        }
        
        if (new Date() > invitation.expiresAt) {
          await db.updateInvitationStatus(invitation.id, "expired");
          throw new Error("Cette invitation a expiré");
        }
        
        return {
          email: invitation.email,
          orgId: invitation.orgId,
          role: invitation.role,
        };
      }),

    revoke: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.revokeInvitation(input.id);
        return { success: true };
      }),
  }),

  // Dashboard
  dashboard: router({
    stats: protectedProcedure
      .input(z.object({
        orgId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        // Get counts for dashboard
        const [projects, notes, teamMembers, appointments] = await Promise.all([
          db.getProjectsByOrg(input.orgId),
          db.getUserNotes(ctx.user.id, input.orgId),
          db.getOrgMembers(input.orgId),
          db.getAppointmentRequests(ctx.user.id, input.orgId),
        ]);
        
        // Count tasks from all projects
        let totalTasks = 0;
        for (const project of projects) {
          const projectTasks = await db.getTasksByProject(project.id);
          totalTasks += projectTasks.length;
        }
        
        // Get user's calendars to fetch events
        const calendars = await db.getUserCalendars(ctx.user.id, input.orgId);
        let upcomingEventsCount = 0;
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        for (const calendar of calendars) {
          const events = await db.getCalendarEvents(calendar.id, now, nextWeek);
          upcomingEventsCount += events.length;
        }
        
        // Count pending appointments
        const pendingAppointments = appointments.filter((a: any) => a.appointment.status === 'pending');
        
        // Count unread messages (simplified - count all recent messages)
        const userChats = await db.getUserChats(ctx.user.id);
        let unreadCount = 0;
        for (const chat of userChats) {
          const messages = await db.getChatMessages(chat.chat.id, 10);
          // Count messages from others in the last 24h
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          unreadCount += messages.filter((m: any) => 
            m.message.userId !== ctx.user.id && 
            new Date(m.message.createdAt) > yesterday
          ).length;
        }
        
        return {
          unreadMessages: unreadCount,
          activeNotes: notes.length,
          upcomingEvents: upcomingEventsCount,
          pendingAppointments: pendingAppointments.length,
          totalProjects: projects.length,
          totalTasks,
          totalMembers: teamMembers.length,
        };
      }),
  }),

  // Teams
  teams: router({
    create: protectedProcedure
      .input(z.object({
        orgId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        createChat: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        let chatId: number | null = null;
        
        // Create team chat if requested
        if (input.createChat) {
          chatId = await db.createChat({
            orgId: input.orgId,
            isGroup: true,
            name: `Équipe ${input.name}`,
            createdBy: ctx.user.id,
          });
        }
        
        const teamId = await db.createTeam({
          orgId: input.orgId,
          name: input.name,
          description: input.description,
          color: input.color || "#3B82F6",
          icon: input.icon,
          chatId,
          createdBy: ctx.user.id,
        });
        
        // Add creator as team leader
        await db.addTeamMember(teamId, ctx.user.id, "leader");
        
        // Add creator to team chat
        if (chatId) {
          await db.addChatMember({ chatId, userId: ctx.user.id });
        }
        
        return { id: teamId, chatId };
      }),

    list: protectedProcedure
      .input(z.object({
        orgId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getTeamsByOrg(input.orgId);
      }),

    get: protectedProcedure
      .input(z.object({
        teamId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getTeamWithMembers(input.teamId);
      }),

    update: protectedProcedure
      .input(z.object({
        teamId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { teamId, ...data } = input;
        await db.updateTeam(teamId, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({
        teamId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteTeam(input.teamId);
        return { success: true };
      }),

    addMember: protectedProcedure
      .input(z.object({
        teamId: z.number(),
        userId: z.number(),
        role: z.enum(["leader", "member"]).default("member"),
      }))
      .mutation(async ({ input }) => {
        await db.addTeamMember(input.teamId, input.userId, input.role);
        
        // Add member to team chat if exists
        const team = await db.getTeamById(input.teamId);
        if (team?.chatId) {
          await db.addChatMember({ chatId: team.chatId, userId: input.userId });
        }
        
        return { success: true };
      }),

    removeMember: protectedProcedure
      .input(z.object({
        teamId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.removeTeamMember(input.teamId, input.userId);
        return { success: true };
      }),

    getMembers: protectedProcedure
      .input(z.object({
        teamId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getTeamMembers(input.teamId);
      }),

    getUserTeams: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserTeams(ctx.user.id);
      }),

    updateMemberRole: protectedProcedure
      .input(z.object({
        teamId: z.number(),
        userId: z.number(),
        role: z.enum(["leader", "member"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateTeamMemberRole(input.teamId, input.userId, input.role);
        return { success: true };
      }),
  }),

  // Admin utilities
  admin: router({
    seedData: protectedProcedure
      .input(z.object({
        orgId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { seedDataForUser } = await import('./seed-data');
        const result = await seedDataForUser(ctx.user.id, input.orgId);
        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;
