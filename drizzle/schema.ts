import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  password: varchar("password", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["owner", "admin", "member", "guest"]).default("member").notNull(),
  displayName: varchar("displayName", { length: 255 }),
  avatarUrl: text("avatarUrl"),
  timezone: varchar("timezone", { length: 64 }).default("UTC"),
  locale: varchar("locale", { length: 10 }).default("fr"),
  status: mysqlEnum("status", ["online", "offline", "away", "busy"]).default("offline"),
  customStatus: varchar("customStatus", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Organizations table
 */
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  logoUrl: text("logoUrl"),
  settingsJson: text("settingsJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Organization membership
 */
export const orgMemberships = mysqlTable("org_memberships", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member", "guest"]).default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orgUserIdx: index("org_user_idx").on(table.orgId, table.userId),
}));

export type OrgMembership = typeof orgMemberships.$inferSelect;
export type InsertOrgMembership = typeof orgMemberships.$inferInsert;

/**
 * Chat rooms (1:1 or group)
 */
export const chats = mysqlTable("chats", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  isGroup: boolean("isGroup").default(false).notNull(),
  name: varchar("name", { length: 255 }),
  avatarUrl: text("avatarUrl"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archived: boolean("archived").default(false),
}, (table) => ({
  orgIdx: index("org_idx").on(table.orgId),
}));

export type Chat = typeof chats.$inferSelect;
export type InsertChat = typeof chats.$inferInsert;

/**
 * Chat members
 */
export const chatMembers = mysqlTable("chat_members", {
  id: int("id").autoincrement().primaryKey(),
  chatId: int("chatId").notNull(),
  userId: int("userId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  lastReadAt: timestamp("lastReadAt"),
}, (table) => ({
  chatUserIdx: index("chat_user_idx").on(table.chatId, table.userId),
}));

export type ChatMember = typeof chatMembers.$inferSelect;
export type InsertChatMember = typeof chatMembers.$inferInsert;

/**
 * Messages
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  chatId: int("chatId").notNull(),
  senderId: int("senderId").notNull(),
  body: text("body").notNull(),
  replyToId: int("replyToId"),
  attachmentUrl: text("attachmentUrl"),
  attachmentType: varchar("attachmentType", { length: 50 }),
  reactions: text("reactions"), // JSON string
  isEdited: boolean("isEdited").default(false),
  isDeleted: boolean("isDeleted").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  chatIdx: index("chat_idx").on(table.chatId),
  senderIdx: index("sender_idx").on(table.senderId),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Files storage metadata
 */
export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  size: int("size").notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  isPublic: boolean("isPublic").default(false),
  downloadCount: int("downloadCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("org_idx").on(table.orgId),
  ownerIdx: index("owner_idx").on(table.ownerId),
}));

export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;

/**
 * Notes (private or public)
 */
export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  ownerId: int("ownerId").notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  contentMarkdown: text("contentMarkdown"),
  tags: text("tags"), // JSON array
  isPinned: boolean("isPinned").default(false),
  isFavorite: boolean("isFavorite").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("org_idx").on(table.orgId),
  ownerIdx: index("owner_idx").on(table.ownerId),
  publicIdx: index("public_idx").on(table.isPublic),
}));

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

/**
 * Note versions for history
 */
export const noteVersions = mysqlTable("note_versions", {
  id: int("id").autoincrement().primaryKey(),
  noteId: int("noteId").notNull(),
  version: int("version").notNull(),
  contentMarkdown: text("contentMarkdown"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  noteIdx: index("note_idx").on(table.noteId),
}));

export type NoteVersion = typeof noteVersions.$inferSelect;
export type InsertNoteVersion = typeof noteVersions.$inferInsert;

/**
 * Calendars (private or public)
 */
export const calendars = mysqlTable("calendars", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  visibility: mysqlEnum("visibility", ["private", "public"]).default("private").notNull(),
  color: varchar("color", { length: 7 }).default("#3b82f6"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("org_idx").on(table.orgId),
  ownerIdx: index("owner_idx").on(table.ownerId),
}));

export type Calendar = typeof calendars.$inferSelect;
export type InsertCalendar = typeof calendars.$inferInsert;

/**
 * Events
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  calendarId: int("calendarId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 500 }),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  allDay: boolean("allDay").default(false),
  recurrence: text("recurrence"), // JSON for recurrence rules
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  calendarIdx: index("calendar_idx").on(table.calendarId),
  startsAtIdx: index("starts_at_idx").on(table.startsAt),
}));

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Event attendees
 */
export const eventAttendees = mysqlTable("event_attendees", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "declined", "tentative"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  eventUserIdx: index("event_user_idx").on(table.eventId, table.userId),
}));

export type EventAttendee = typeof eventAttendees.$inferSelect;
export type InsertEventAttendee = typeof eventAttendees.$inferInsert;

/**
 * Appointment requests
 */
export const appointmentRequests = mysqlTable("appointment_requests", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  requesterId: int("requesterId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  proposedSlotsJson: text("proposedSlotsJson").notNull(), // JSON array of time slots
  status: mysqlEnum("status", ["pending", "confirmed", "declined", "cancelled"]).default("pending").notNull(),
  decidedSlot: timestamp("decidedSlot"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("org_idx").on(table.orgId),
  requesterIdx: index("requester_idx").on(table.requesterId),
}));

export type AppointmentRequest = typeof appointmentRequests.$inferSelect;
export type InsertAppointmentRequest = typeof appointmentRequests.$inferInsert;

/**
 * Appointment invitees
 */
export const appointmentInvitees = mysqlTable("appointment_invitees", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId").notNull(),
  userId: int("userId").notNull(),
  response: mysqlEnum("response", ["pending", "accepted", "declined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  appointmentUserIdx: index("appointment_user_idx").on(table.appointmentId, table.userId),
}));

export type AppointmentInvitee = typeof appointmentInvitees.$inferSelect;
export type InsertAppointmentInvitee = typeof appointmentInvitees.$inferInsert;

/**
 * Notification subscriptions for push
 */
export const notificationSubscriptions = mysqlTable("notification_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  keysJson: text("keysJson").notNull(), // JSON with p256dh and auth keys
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
}));

export type NotificationSubscription = typeof notificationSubscriptions.$inferSelect;
export type InsertNotificationSubscription = typeof notificationSubscriptions.$inferInsert;

/**
 * In-app notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["chat", "mention", "event", "appointment", "note", "system"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  actionUrl: varchar("actionUrl", { length: 500 }),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  readIdx: index("read_idx").on(table.isRead),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Audit logs
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  actorId: int("actorId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("targetType", { length: 50 }),
  targetId: int("targetId"),
  metadata: text("metadata"), // JSON
  ip: varchar("ip", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("org_idx").on(table.orgId),
  actorIdx: index("actor_idx").on(table.actorId),
  actionIdx: index("action_idx").on(table.action),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * User availability slots
 */
export const availabilitySlots = mysqlTable("availability_slots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0 = Sunday, 6 = Saturday
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM format
  endTime: varchar("endTime", { length: 5 }).notNull(), // HH:MM format
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
}));

export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;
export type InsertAvailabilitySlot = typeof availabilitySlots.$inferInsert;

