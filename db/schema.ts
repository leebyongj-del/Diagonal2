import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('rooms', {
 id: text('id').primaryKey(), ownerId: text('owner_id').notNull(), code: text('code').notNull().unique(),
 title: text('title').notNull(), grade: integer('grade').notNull(), classNo: integer('class_no').notNull(),
 noteEnabled: integer('note_enabled').notNull().default(1), extraPrompts: text('extra_prompts').notNull().default('[]'),
 open: integer('open').notNull().default(1), createdAt: text('created_at').notNull(),
});
export const submissions = sqliteTable('submissions', {
 id: text('id').primaryKey(), roomId: text('room_id').notNull().references(()=>rooms.id),
 studentNo: integer('student_no').notNull(), name: text('name').notNull(),
 answers: text('answers').notNull(), observations: text('observations').notNull(),
 extras: text('extras').notNull().default('[]'),
 digest: text('digest').notNull(), createdAt: text('created_at').notNull(),
}, t=>[index('submissions_room_time').on(t.roomId,t.createdAt,t.id)]);
export const teacherSessions = sqliteTable('teacher_sessions', {
 tokenHash: text('token_hash').primaryKey(), ownerId: text('owner_id').notNull(), expiresAt: integer('expires_at').notNull(),
}, t=>[index('teacher_sessions_expiry').on(t.expiresAt)]);
export const teacherLoginAttempts = sqliteTable('teacher_login_attempts', {
 key: text('key').primaryKey(), count: integer('count').notNull().default(0), expiresAt: integer('expires_at').notNull(),
}, t=>[index('teacher_attempts_expiry').on(t.expiresAt)]);
