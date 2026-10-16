ALTER TABLE `rooms` ADD `note_enabled` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `extra_prompts` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `extras` text DEFAULT '[]' NOT NULL;