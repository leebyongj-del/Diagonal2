CREATE TABLE `teacher_login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `teacher_attempts_expiry` ON `teacher_login_attempts` (`expires_at`);--> statement-breakpoint
CREATE TABLE `teacher_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `teacher_sessions_expiry` ON `teacher_sessions` (`expires_at`);