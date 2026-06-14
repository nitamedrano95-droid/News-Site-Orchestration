-- 002_seo_fields.sql — Add SEO + workflow columns to ARTICULOS_CMS
-- Run via: wrangler d1 migrations apply <DB_NAME>
-- Idempotent: uses try/catch in JS at the Worker level if D1 lacks IF NOT EXISTS on ALTER.
-- For D1, we use a separate migration that re-runs safely because the migration runner tracks applied migrations.

-- SEO fields for the Yoast-like panel
ALTER TABLE ARTICULOS_CMS ADD COLUMN META_TITLE TEXT;
ALTER TABLE ARTICULOS_CMS ADD COLUMN META_DESCRIPTION TEXT;
ALTER TABLE ARTICULOS_CMS ADD COLUMN FOCUS_KEYWORD TEXT;
ALTER TABLE ARTICULOS_CMS ADD COLUMN TAGS TEXT;
ALTER TABLE ARTICULOS_CMS ADD COLUMN READING_SCORE INTEGER;
ALTER TABLE ARTICULOS_CMS ADD COLUMN READING_ANALYSIS TEXT;

-- Editorial workflow
ALTER TABLE ARTICULOS_CMS ADD COLUMN STATE_HISTORY TEXT;
