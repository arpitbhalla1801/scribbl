import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './db/schema.ts';

// Falls back to a syntactically-valid but unusable URL so this module (and
// anything that imports it, like auth.ts) can load without DATABASE_URL set
// - e.g. local dev before Neon is wired up, or Next's build-time module
// evaluation. Any actual query then fails loudly instead of silently
// hitting a real database.
const sql = neon(process.env.DATABASE_URL || 'postgres://unset:unset@unset/unset');

export const db = drizzle(sql, { schema });
