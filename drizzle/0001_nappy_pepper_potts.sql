CREATE TABLE `appointment_invitees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int NOT NULL,
	`userId` int NOT NULL,
	`response` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appointment_invitees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointment_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`requesterId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`proposedSlotsJson` text NOT NULL,
	`status` enum('pending','confirmed','declined','cancelled') NOT NULL DEFAULT 'pending',
	`decidedSlot` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointment_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`actorId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`targetType` varchar(50),
	`targetId` int,
	`metadata` text,
	`ip` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `availability_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `availability_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`visibility` enum('private','public') NOT NULL DEFAULT 'private',
	`color` varchar(7) DEFAULT '#3b82f6',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendars_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`lastReadAt` timestamp,
	CONSTRAINT `chat_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`isGroup` boolean NOT NULL DEFAULT false,
	`name` varchar(255),
	`avatarUrl` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`archived` boolean DEFAULT false,
	CONSTRAINT `chats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_attendees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','accepted','declined','tentative') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_attendees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`calendarId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`location` varchar(500),
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`allDay` boolean DEFAULT false,
	`recurrence` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`mimeType` varchar(100),
	`size` int NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`isPublic` boolean DEFAULT false,
	`downloadCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatId` int NOT NULL,
	`senderId` int NOT NULL,
	`body` text NOT NULL,
	`replyToId` int,
	`attachmentUrl` text,
	`attachmentType` varchar(50),
	`reactions` text,
	`isEdited` boolean DEFAULT false,
	`isDeleted` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `note_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`noteId` int NOT NULL,
	`version` int NOT NULL,
	`contentMarkdown` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `note_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`ownerId` int NOT NULL,
	`isPublic` boolean NOT NULL DEFAULT false,
	`title` varchar(500) NOT NULL,
	`contentMarkdown` text,
	`tags` text,
	`isPinned` boolean DEFAULT false,
	`isFavorite` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` text NOT NULL,
	`keysJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('chat','mention','event','appointment','note','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text,
	`actionUrl` varchar(500),
	`isRead` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `org_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member','guest') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `org_memberships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`logoUrl` text,
	`settingsJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('owner','admin','member','guest') NOT NULL DEFAULT 'member';--> statement-breakpoint
ALTER TABLE `users` ADD `displayName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `timezone` varchar(64) DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE `users` ADD `locale` varchar(10) DEFAULT 'fr';--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('online','offline','away','busy') DEFAULT 'offline';--> statement-breakpoint
ALTER TABLE `users` ADD `customStatus` varchar(100);--> statement-breakpoint
CREATE INDEX `appointment_user_idx` ON `appointment_invitees` (`appointmentId`,`userId`);--> statement-breakpoint
CREATE INDEX `org_idx` ON `appointment_requests` (`orgId`);--> statement-breakpoint
CREATE INDEX `requester_idx` ON `appointment_requests` (`requesterId`);--> statement-breakpoint
CREATE INDEX `org_idx` ON `audit_logs` (`orgId`);--> statement-breakpoint
CREATE INDEX `actor_idx` ON `audit_logs` (`actorId`);--> statement-breakpoint
CREATE INDEX `action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `availability_slots` (`userId`);--> statement-breakpoint
CREATE INDEX `org_idx` ON `calendars` (`orgId`);--> statement-breakpoint
CREATE INDEX `owner_idx` ON `calendars` (`ownerId`);--> statement-breakpoint
CREATE INDEX `chat_user_idx` ON `chat_members` (`chatId`,`userId`);--> statement-breakpoint
CREATE INDEX `org_idx` ON `chats` (`orgId`);--> statement-breakpoint
CREATE INDEX `event_user_idx` ON `event_attendees` (`eventId`,`userId`);--> statement-breakpoint
CREATE INDEX `calendar_idx` ON `events` (`calendarId`);--> statement-breakpoint
CREATE INDEX `starts_at_idx` ON `events` (`startsAt`);--> statement-breakpoint
CREATE INDEX `org_idx` ON `files` (`orgId`);--> statement-breakpoint
CREATE INDEX `owner_idx` ON `files` (`ownerId`);--> statement-breakpoint
CREATE INDEX `chat_idx` ON `messages` (`chatId`);--> statement-breakpoint
CREATE INDEX `sender_idx` ON `messages` (`senderId`);--> statement-breakpoint
CREATE INDEX `note_idx` ON `note_versions` (`noteId`);--> statement-breakpoint
CREATE INDEX `org_idx` ON `notes` (`orgId`);--> statement-breakpoint
CREATE INDEX `owner_idx` ON `notes` (`ownerId`);--> statement-breakpoint
CREATE INDEX `public_idx` ON `notes` (`isPublic`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `notification_subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `read_idx` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `org_user_idx` ON `org_memberships` (`orgId`,`userId`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);