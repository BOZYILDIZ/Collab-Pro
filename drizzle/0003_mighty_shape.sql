CREATE TABLE `project_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member','viewer') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`visibility` enum('private','team','public') NOT NULL DEFAULT 'team',
	`status` enum('active','archived','completed') NOT NULL DEFAULT 'active',
	`startDate` timestamp,
	`endDate` timestamp,
	`ownerId` int NOT NULL,
	`color` varchar(7) DEFAULT '#3b82f6',
	`icon` varchar(50),
	`settingsJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`goal` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`status` enum('planned','active','completed') NOT NULL DEFAULT 'planned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sprints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`fileId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_dependencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`dependsOnTaskId` int NOT NULL,
	`type` enum('blocks','blocked_by','relates_to') NOT NULL DEFAULT 'blocks',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_dependencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`parentTaskId` int,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status` varchar(50) NOT NULL DEFAULT 'todo',
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`assigneeId` int,
	`reporterId` int NOT NULL,
	`dueDate` timestamp,
	`startDate` timestamp,
	`estimatedHours` int,
	`actualHours` int,
	`tags` text,
	`position` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `project_member_project_idx` ON `project_members` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_member_user_idx` ON `project_members` (`userId`);--> statement-breakpoint
CREATE INDEX `project_org_idx` ON `projects` (`orgId`);--> statement-breakpoint
CREATE INDEX `project_owner_idx` ON `projects` (`ownerId`);--> statement-breakpoint
CREATE INDEX `sprint_project_idx` ON `sprints` (`projectId`);--> statement-breakpoint
CREATE INDEX `task_attachment_task_idx` ON `task_attachments` (`taskId`);--> statement-breakpoint
CREATE INDEX `task_attachment_file_idx` ON `task_attachments` (`fileId`);--> statement-breakpoint
CREATE INDEX `task_comment_task_idx` ON `task_comments` (`taskId`);--> statement-breakpoint
CREATE INDEX `task_dep_task_idx` ON `task_dependencies` (`taskId`);--> statement-breakpoint
CREATE INDEX `task_dep_depends_idx` ON `task_dependencies` (`dependsOnTaskId`);--> statement-breakpoint
CREATE INDEX `task_project_idx` ON `tasks` (`projectId`);--> statement-breakpoint
CREATE INDEX `task_assignee_idx` ON `tasks` (`assigneeId`);--> statement-breakpoint
CREATE INDEX `task_parent_idx` ON `tasks` (`parentTaskId`);--> statement-breakpoint
CREATE INDEX `task_status_idx` ON `tasks` (`status`);