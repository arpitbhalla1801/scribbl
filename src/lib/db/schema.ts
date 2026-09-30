import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// BetterAuth's required core tables (user/session/account/verification),
// plus isAnonymous for the anonymous-upgrade plugin. Column shapes follow
// what BetterAuth's Drizzle adapter expects:
// https://www.better-auth.com/docs/concepts/database
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  isAnonymous: boolean('is_anonymous').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// #37: links an ephemeral per-game playerId to the durable User it was
// played under, if any. Gameplay never reads this table - it exists so
// later features (crews #42, reputation #48, blocks #47) have a stable
// identity to key off instead of a per-game-only playerId.
export const playerLinks = pgTable('player_links', {
  playerId: text('player_id').primaryKey(),
  roomId: text('room_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// #47: a block or mute one user placed on another. id is a deterministic
// `${ownerUserId}:${targetUserId}:${type}` composite rather than a random
// one plus a separate unique index - keeps "block if not already blocked"
// and "unblock" both a plain primary-key operation.
export const userRelations = pgTable('user_relations', {
  id: text('id').primaryKey(),
  ownerUserId: text('owner_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  targetUserId: text('target_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'block' | 'mute'
  // Display snapshot only (the in-game name at block time) - not identity,
  // since a User has no durable username of its own yet.
  targetName: text('target_name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// #46: a post-game report against another player, for manual review later
// (AI OCR/image moderation comes later per the issue - this just captures
// the report). reporter/reportedUserId are best-effort via playerLinks and
// may be null if that player was never linked to a signed-in user.
export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull(),
  reporterUserId: text('reporter_user_id').references(() => user.id, { onDelete: 'set null' }),
  reportedUserId: text('reported_user_id').references(() => user.id, { onDelete: 'set null' }),
  reportedName: text('reported_name').notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
