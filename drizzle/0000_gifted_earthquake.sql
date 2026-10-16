CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`grade` integer NOT NULL,
	`class_no` integer NOT NULL,
	`open` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_code_unique` ON `rooms` (`code`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`student_no` integer NOT NULL,
	`name` text NOT NULL,
	`answers` text NOT NULL,
	`observations` text NOT NULL,
	`digest` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submissions_room_time` ON `submissions` (`room_id`,`created_at`,`id`);