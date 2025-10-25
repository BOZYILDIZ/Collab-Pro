import { eq, and, desc, or, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, organizations, InsertOrganization, orgMemberships, InsertOrgMembership,
  chats, InsertChat, chatMembers, InsertChatMember, messages, InsertMessage,
  files, InsertFile, notes, InsertNote, noteVersions, InsertNoteVersion,
  calendars, InsertCalendar, events, InsertEvent, eventAttendees, InsertEventAttendee,
  appointmentRequests, InsertAppointmentRequest, appointmentInvitees, InsertAppointmentInvitee,
  notificationSubscriptions, InsertNotificationSubscription, notifications, InsertNotification,
  auditLogs, InsertAuditLog, availabilitySlots, InsertAvailabilitySlot,
  projects, InsertProject, projectMembers, InsertProjectMember,
  tasks, InsertTask, taskComments, InsertTaskComment, taskDependencies, InsertTaskDependency,
  sprints, InsertSprint, taskAttachments, InsertTaskAttachment,
  noteTemplates, InsertNoteTemplate,
  invitations, InsertInvitation,
  teams, InsertTeam, teamMembers, InsertTeamMember
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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

// ============ USER MANAGEMENT ============

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
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "displayName", "avatarUrl", "timezone", "locale", "customStatus"] as const;
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
    } else if (user.openId === ENV.ownerId) {
      values.role = 'owner';
      updateSet.role = 'owner';
    }
    if (user.status !== undefined) {
      values.status = user.status;
      updateSet.status = user.status;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
    
    // Ajouter automatiquement l'utilisateur à l'organisation par défaut
    const existingUser = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    if (existingUser.length > 0) {
      const userId = existingUser[0].id;
      
      // Vérifier si l'utilisateur est déjà membre de l'organisation
      const existingMembership = await db.select()
        .from(orgMemberships)
        .where(and(
          eq(orgMemberships.userId, userId),
          eq(orgMemberships.orgId, 1) // Organisation par défaut
        ))
        .limit(1);
      
      // Si pas encore membre, l'ajouter
      if (existingMembership.length === 0) {
        await db.insert(orgMemberships).values({
          orgId: 1, // Organisation par défaut
          userId: userId,
          role: 'member',
        });
        console.log(`[Database] User ${userId} automatically added to organization 1`);
      }
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, updates: {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
}) {
  const db = await getDb();
  if (!db) return;
  
  const updateData: any = {};
  if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.avatarUrl !== undefined) updateData.avatarUrl = updates.avatarUrl;
  
  await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function updateUserPassword(userId: number, currentPassword: string, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Récupérer l'utilisateur
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (user.length === 0) throw new Error("User not found");
  
  // Vérifier le mot de passe actuel (si l'utilisateur a un mot de passe)
  if (user[0].password) {
    // TODO: Implémenter la vérification du mot de passe avec bcrypt
    // Pour l'instant, on accepte n'importe quel mot de passe actuel
  }
  
  // TODO: Hasher le nouveau mot de passe avec bcrypt
  // Pour l'instant, on stocke en clair (PAS RECOMMANDÉ EN PRODUCTION)
  await db.update(users).set({ password: newPassword }).where(eq(users.id, userId));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserStatus(userId: number, status: "online" | "offline" | "away" | "busy", customStatus?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ status, customStatus }).where(eq(users.id, userId));
}

export async function searchUsers(query: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users)
    .where(or(
      sql`${users.name} LIKE ${`%${query}%`}`,
      sql`${users.email} LIKE ${`%${query}%`}`,
      sql`${users.displayName} LIKE ${`%${query}%`}`
    ))
    .limit(limit);
}

// ============ ORGANIZATION MANAGEMENT ============

export async function createOrganization(org: InsertOrganization) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(organizations).values(org);
  return Number(result[0].insertId);
}

export async function getOrganization(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function addOrgMember(membership: InsertOrgMembership) {
  const db = await getDb();
  if (!db) return;
  await db.insert(orgMemberships).values(membership);
}

export async function getOrgMembers(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    membership: orgMemberships,
    user: users
  })
  .from(orgMemberships)
  .innerJoin(users, eq(orgMemberships.userId, users.id))
  .where(eq(orgMemberships.orgId, orgId));
}

// ============ CHAT MANAGEMENT ============

export async function createChat(chat: InsertChat) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(chats).values(chat);
  return Number(result[0].insertId);
}

export async function addChatMember(member: InsertChatMember) {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatMembers).values(member);
}

export async function getUserChats(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    chat: chats,
    member: chatMembers
  })
  .from(chatMembers)
  .innerJoin(chats, eq(chatMembers.chatId, chats.id))
  .where(eq(chatMembers.userId, userId))
  .orderBy(desc(chats.updatedAt));
}

export async function getChatById(chatId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getChatMembers(chatId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    member: chatMembers,
    user: users
  })
  .from(chatMembers)
  .innerJoin(users, eq(chatMembers.userId, users.id))
  .where(eq(chatMembers.chatId, chatId));
}

export async function createMessage(message: InsertMessage) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(messages).values(message);
  await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, message.chatId));
  return Number(result[0].insertId);
}

export async function getChatMessages(chatId: number, limit = 50, beforeId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(messages.chatId, chatId),
    eq(messages.isDeleted, false)
  ];
  
  if (beforeId) {
    conditions.push(sql`${messages.id} < ${beforeId}`);
  }
  
  // Get messages in descending order first (to get the latest N messages)
  const results = await db.select({
    message: messages,
    sender: users
  })
  .from(messages)
  .innerJoin(users, eq(messages.senderId, users.id))
  .where(and(...conditions))
  .orderBy(desc(messages.createdAt))
  .limit(limit);
  
  // Reverse to show oldest first (chronological order)
  return results.reverse();
}

export async function updateLastRead(chatId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(chatMembers)
    .set({ lastReadAt: new Date() })
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
}

// ============ FILE MANAGEMENT ============

export async function createFile(file: InsertFile) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(files).values(file);
  return Number(result[0].insertId);
}

export async function getFileById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserFiles(userId: number, orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(files)
    .where(and(eq(files.ownerId, userId), eq(files.orgId, orgId)))
    .orderBy(desc(files.createdAt));
}

// ============ NOTES MANAGEMENT ============

export async function createNote(note: InsertNote) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(notes).values(note);
  return Number(result[0].insertId);
}

export async function updateNote(id: number, updates: Partial<InsertNote>) {
  const db = await getDb();
  if (!db) return;
  await db.update(notes).set(updates).where(eq(notes.id, id));
}

export async function deleteNote(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notes).where(eq(notes.id, id));
}

export async function getNoteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserNotes(userId: number, orgId: number, isPublic?: boolean) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(notes.orgId, orgId)];
  
  if (isPublic !== undefined) {
    conditions.push(eq(notes.isPublic, isPublic));
    if (!isPublic) {
      conditions.push(eq(notes.ownerId, userId));
    }
  } else {
    conditions.push(or(eq(notes.isPublic, true), eq(notes.ownerId, userId))!);
  }
  
  return db.select().from(notes)
    .where(and(...conditions))
    .orderBy(desc(notes.updatedAt));
}

export async function createNoteVersion(version: InsertNoteVersion) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(noteVersions).values(version);
  return Number(result[0].insertId);
}

export async function getNoteVersions(noteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(noteVersions)
    .where(eq(noteVersions.noteId, noteId))
    .orderBy(desc(noteVersions.version));
}

export async function searchNotes(userId: number, orgId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notes)
    .where(and(
      eq(notes.orgId, orgId),
      or(eq(notes.isPublic, true), eq(notes.ownerId, userId))!,
      or(
        sql`${notes.title} LIKE ${`%${query}%`}`,
        sql`${notes.contentMarkdown} LIKE ${`%${query}%`}`
      )
    ))
    .orderBy(desc(notes.updatedAt));
}

// ============ CALENDAR & EVENTS ============

export async function createCalendar(calendar: InsertCalendar) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(calendars).values(calendar);
  return Number(result[0].insertId);
}

export async function getUserCalendars(userId: number, orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calendars)
    .where(and(
      eq(calendars.orgId, orgId),
      or(eq(calendars.visibility, "public"), eq(calendars.ownerId, userId))!
    ));
}

export async function createEvent(event: InsertEvent) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(events).values(event);
  return Number(result[0].insertId);
}

export async function getCalendarEvents(calendarId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(events.calendarId, calendarId)];
  if (startDate) conditions.push(gte(events.startsAt, startDate));
  if (endDate) conditions.push(lte(events.endsAt, endDate));
  
  return db.select().from(events)
    .where(and(...conditions))
    .orderBy(events.startsAt);
}

export async function addEventAttendee(attendee: InsertEventAttendee) {
  const db = await getDb();
  if (!db) return;
  await db.insert(eventAttendees).values(attendee);
}

export async function updateAttendeeStatus(eventId: number, userId: number, status: "pending" | "accepted" | "declined" | "tentative") {
  const db = await getDb();
  if (!db) return;
  await db.update(eventAttendees)
    .set({ status })
    .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)));
}

// ============ APPOINTMENTS ============

export async function createAppointmentRequest(appointment: InsertAppointmentRequest) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(appointmentRequests).values(appointment);
  return Number(result[0].insertId);
}

export async function addAppointmentInvitee(invitee: InsertAppointmentInvitee) {
  const db = await getDb();
  if (!db) return;
  await db.insert(appointmentInvitees).values(invitee);
}

export async function getAppointmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(appointmentRequests).where(eq(appointmentRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAppointmentRequests(userId: number, orgId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    appointment: appointmentRequests,
    invitees: sql`GROUP_CONCAT(${appointmentInvitees.userId})`
  })
  .from(appointmentRequests)
  .leftJoin(appointmentInvitees, eq(appointmentRequests.id, appointmentInvitees.appointmentId))
  .where(and(
    eq(appointmentRequests.orgId, orgId),
    or(
      eq(appointmentRequests.requesterId, userId),
      sql`${appointmentInvitees.userId} = ${userId}`
    )
  ))
  .groupBy(appointmentRequests.id)
  .orderBy(desc(appointmentRequests.createdAt));
}

export async function updateAppointmentStatus(id: number, status: "pending" | "confirmed" | "declined" | "cancelled", decidedSlot?: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(appointmentRequests)
    .set({ status, decidedSlot })
    .where(eq(appointmentRequests.id, id));
}

// ============ AVAILABILITY ============

export async function setUserAvailability(userId: number, slots: InsertAvailabilitySlot[]) {
  const db = await getDb();
  if (!db) return;
  
  // Delete existing slots
  await db.delete(availabilitySlots).where(eq(availabilitySlots.userId, userId));
  
  // Insert new slots
  if (slots.length > 0) {
    await db.insert(availabilitySlots).values(slots);
  }
}

export async function getUserAvailability(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(availabilitySlots)
    .where(eq(availabilitySlots.userId, userId))
    .orderBy(availabilitySlots.dayOfWeek, availabilitySlots.startTime);
}

// ============ NOTIFICATIONS ============

export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(notifications).values(notification);
  return Number(result[0].insertId);
}

export async function getUserNotifications(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

export async function addNotificationSubscription(subscription: InsertNotificationSubscription) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notificationSubscriptions).values(subscription);
}

export async function getUserSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notificationSubscriptions)
    .where(eq(notificationSubscriptions.userId, userId));
}

// ============ AUDIT LOGS ============

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(log);
}

export async function getAuditLogs(orgId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs)
    .where(eq(auditLogs.orgId, orgId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}




// ============ PROJECT MANAGEMENT ============

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(projects).values(data);
  return Number(result.insertId);
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProjectsByOrg(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.orgId, orgId));
}

export async function getUserProjects(userId: number, orgId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get projects where user is a member
  return db
    .select({ 
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
      orgId: projects.orgId,
      ownerId: projects.ownerId,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
    .where(and(
      eq(projects.orgId, orgId),
      eq(projectMembers.userId, userId)
    ));
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projects).where(eq(projects.id, id));
}

// Project members
export async function addProjectMember(data: InsertProjectMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(projectMembers).values(data);
  return Number(result.insertId);
}

export async function getProjectMembers(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      membership: projectMembers,
      user: users,
    })
    .from(projectMembers)
    .leftJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));
}

export async function removeProjectMember(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
}

// Tasks
export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(tasks).values(data);
  return Number(result.insertId);
}

export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTasksByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      task: tasks,
      assignee: users,
      reporter: users,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.projectId, projectId))
    .orderBy(tasks.position);
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tasks).set(data).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function getSubtasks(parentTaskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.parentTaskId, parentTaskId));
}

// Task comments
export async function createTaskComment(data: InsertTaskComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(taskComments).values(data);
  return Number(result.insertId);
}

export async function getTaskComments(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      comment: taskComments,
      user: users,
    })
    .from(taskComments)
    .leftJoin(users, eq(taskComments.userId, users.id))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(taskComments.createdAt);
}

// Sprints
export async function createSprint(data: InsertSprint) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(sprints).values(data);
  return Number(result.insertId);
}

export async function getSprintsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sprints).where(eq(sprints.projectId, projectId));
}

export async function updateSprint(id: number, data: Partial<InsertSprint>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sprints).set(data).where(eq(sprints.id, id));
}



// ============================================================================
// NOTE TEMPLATES
// ============================================================================

export async function getNoteTemplates() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(noteTemplates);
}

export async function getNoteTemplate(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(noteTemplates).where(eq(noteTemplates.id, id)).limit(1);
  return result[0];
}




// ============ INVITATIONS ============

export async function createInvitation(invitation: InsertInvitation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(invitations).values(invitation);
  return result.insertId;
}

export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);
  
  return invitation || null;
}

export async function getInvitationsByOrg(orgId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select({
      invitation: invitations,
      inviter: users,
    })
    .from(invitations)
    .leftJoin(users, eq(invitations.invitedBy, users.id))
    .where(eq(invitations.orgId, orgId))
    .orderBy(desc(invitations.createdAt));
}

export async function updateInvitationStatus(
  id: number,
  status: "pending" | "accepted" | "expired" | "revoked",
  acceptedAt?: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { status };
  if (acceptedAt) {
    updateData.acceptedAt = acceptedAt;
  }
  
  await db
    .update(invitations)
    .set(updateData)
    .where(eq(invitations.id, id));
}

export async function revokeInvitation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(eq(invitations.id, id));
}



// ============ TEAMS ============

export async function createTeam(team: InsertTeam) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(teams).values(team);
  return result.insertId;
}

export async function getTeamsByOrg(orgId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(teams)
    .where(eq(teams.orgId, orgId))
    .orderBy(teams.name);
}

export async function getTeamById(teamId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  
  return team || null;
}

export async function updateTeam(teamId: number, data: Partial<InsertTeam>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(teams)
    .set(data)
    .where(eq(teams.id, teamId));
}

export async function deleteTeam(teamId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete team members first
  await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
  
  // Delete team
  await db.delete(teams).where(eq(teams.id, teamId));
}

export async function addTeamMember(teamId: number, userId: number, role: "leader" | "member" = "member") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(teamMembers).values({
    teamId,
    userId,
    role,
  });
}

export async function removeTeamMember(teamId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(teamMembers)
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId)
    ));
}

export async function getTeamMembers(teamId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select({
      member: teamMembers,
      user: users,
    })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));
}

export async function getUserTeams(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select({
      team: teams,
      membership: teamMembers,
    })
    .from(teamMembers)
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId));
}

export async function updateTeamMemberRole(teamId: number, userId: number, role: "leader" | "member") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(teamMembers)
    .set({ role })
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId)
    ));
}

export async function getTeamWithMembers(teamId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const team = await getTeamById(teamId);
  if (!team) return null;
  
  const members = await getTeamMembers(teamId);
  
  return {
    ...team,
    members,
  };
}

