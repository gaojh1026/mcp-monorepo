-- Rollback Migration: Drop Initial Schema
-- Description: Drops tables, indexes, triggers, and functions created in the initial schema

-- Drop triggers
DROP TRIGGER IF EXISTS update_ui_component_example_updated_at ON "ui_component_example";
DROP TRIGGER IF EXISTS update_ui_component_updated_at ON "ui_component";
DROP TRIGGER IF EXISTS update_ui_registry_updated_at ON "ui_registry";

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse order due to foreign key constraints)
DROP TABLE IF EXISTS "ui_component_example" CASCADE;
DROP TABLE IF EXISTS "ui_component" CASCADE;
DROP TABLE IF EXISTS "ui_registry" CASCADE;

