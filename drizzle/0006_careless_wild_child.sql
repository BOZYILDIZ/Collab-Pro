CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('leader','member') NOT NULL DEFAULT 'member',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`color` varchar(7) DEFAULT '#3B82F6',
	`icon` varchar(50),
	`chatId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `team_user_idx` ON `team_members` (`teamId`,`userId`);--> statement-breakpoint
CREATE INDEX `user_team_idx` ON `team_members` (`userId`,`teamId`);--> statement-breakpoint
CREATE INDEX `org_idx` ON `teams` (`orgId`);