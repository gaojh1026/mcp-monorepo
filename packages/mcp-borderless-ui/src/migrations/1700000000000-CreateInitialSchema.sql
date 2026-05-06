-- Migration: Create Initial Schema
-- Description: Creates tables for UI registries, components, and examples

-- Create ui_registry table
CREATE TABLE IF NOT EXISTS "ui_registry" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "framework" TEXT NOT NULL,
    "npm_package" TEXT,
    "install_command" TEXT,
    "docs_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for ui_registry
CREATE INDEX IF NOT EXISTS "idx_ui_registry_slug_lower" ON "ui_registry" ("slug");
CREATE INDEX IF NOT EXISTS "idx_ui_registry_framework_active" ON "ui_registry" ("framework", "is_active");

-- Create ui_component table
CREATE TABLE IF NOT EXISTS "ui_component" (
    "id" SERIAL PRIMARY KEY,
    "registry_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "dependencies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'stable',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FK_ui_component_registry" FOREIGN KEY ("registry_id") 
        REFERENCES "ui_registry"("id") ON DELETE CASCADE
);

-- Create indexes for ui_component
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ui_component_registry_slug" 
    ON "ui_component" ("registry_id", "slug");
CREATE INDEX IF NOT EXISTS "idx_ui_component_registry_type_status" 
    ON "ui_component" ("registry_id", "type", "status");

-- Create ui_component_example table
CREATE TABLE IF NOT EXISTS "ui_component_example" (
    "id" SERIAL PRIMARY KEY,
    "component_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL UNIQUE,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "language" TEXT,
    "code" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FK_ui_component_example_component" FOREIGN KEY ("component_id") 
        REFERENCES "ui_component"("id") ON DELETE CASCADE
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_ui_registry_updated_at 
    BEFORE UPDATE ON "ui_registry"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ui_component_updated_at 
    BEFORE UPDATE ON "ui_component"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ui_component_example_updated_at 
    BEFORE UPDATE ON "ui_component_example"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

