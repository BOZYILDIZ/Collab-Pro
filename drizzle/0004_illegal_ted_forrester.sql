CREATE TABLE `note_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`contentMarkdown` text NOT NULL,
	`category` varchar(100),
	`icon` varchar(50),
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `note_templates_id` PRIMARY KEY(`id`)
);
