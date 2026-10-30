import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`artworks\` (
  	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  	\`live\` integer DEFAULT false,
  	\`status\` text DEFAULT 'hidden',
  	\`sight\` text,
  	\`smell\` text,
  	\`taste\` text,
  	\`touch\` text,
  	\`hearing\` text,
  	\`feeling\` text,
  	\`main_image_id\` integer,
  	\`price\` numeric,
  	\`size\` text,
  	\`year\` numeric,
  	\`search_text\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`main_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`artworks_main_image_idx\` ON \`artworks\` (\`main_image_id\`);`)
  await db.run(sql`CREATE INDEX \`artworks_updated_at_idx\` ON \`artworks\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`artworks_created_at_idx\` ON \`artworks\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`artworks_locales\` (
  	\`title\` text,
  	\`description\` text,
  	\`materials\` text,
  	\`medium\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artworks\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`artworks_locales_locale_parent_id_unique\` ON \`artworks_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`artworks_locales_parent_id_idx\` ON \`artworks_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`artworks_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`artworks\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`artworks_texts_order_parent\` ON \`artworks_texts\` (\`order\`,\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`artworks_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`media_id\` integer,
  	\`series_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`artworks\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`series_id\`) REFERENCES \`series\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`artworks_rels_order_idx\` ON \`artworks_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`artworks_rels_parent_idx\` ON \`artworks_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`artworks_rels_path_idx\` ON \`artworks_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`artworks_rels_media_id_idx\` ON \`artworks_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`artworks_rels_series_id_idx\` ON \`artworks_rels\` (\`series_id\`);`)
  await db.run(sql`CREATE TABLE \`series\` (
  	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  	\`slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`series_slug_idx\` ON \`series\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`series_updated_at_idx\` ON \`series\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`series_created_at_idx\` ON \`series\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`series_locales\` (
  	\`name\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`series\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`series_locales_locale_parent_id_unique\` ON \`series_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`series_locales_parent_id_idx\` ON \`series_locales\` (\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`prefix\` text DEFAULT 'media';`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`alt\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`artworks_id\` integer REFERENCES artworks(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`series_id\` integer REFERENCES series(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_artworks_id_idx\` ON \`payload_locked_documents_rels\` (\`artworks_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_series_id_idx\` ON \`payload_locked_documents_rels\` (\`series_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`artworks\`;`)
  await db.run(sql`DROP TABLE \`artworks_locales\`;`)
  await db.run(sql`DROP TABLE \`artworks_texts\`;`)
  await db.run(sql`DROP TABLE \`artworks_rels\`;`)
  await db.run(sql`DROP TABLE \`series\`;`)
  await db.run(sql`DROP TABLE \`series_locales\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`alt\` text NOT NULL;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`prefix\`;`)
}
