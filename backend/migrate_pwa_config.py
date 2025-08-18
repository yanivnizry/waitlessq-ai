#!/usr/bin/env python3
"""
Database migration script to update PWA configuration for organization-based customization
"""

import sqlite3
import sys
import os

def migrate_pwa_config():
    """Update PWA config table for organization-based customization"""
    
    # Database path
    db_path = "waitlessq.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database file {db_path} not found!")
        return False
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔄 Starting PWA configuration migration...")
        
        # Check if the table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='pwa_configs'
        """)
        
        if not cursor.fetchone():
            print("📝 Creating new pwa_configs table...")
            # Create new table with organization-based structure
            cursor.execute("""
                CREATE TABLE pwa_configs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    organization_id INTEGER NOT NULL,
                    
                    -- PWA Basic Info
                    app_name VARCHAR(255) NOT NULL,
                    app_short_name VARCHAR(12),
                    app_description TEXT,
                    app_version VARCHAR(20) DEFAULT '1.0.0',
                    
                    -- Branding & Colors
                    theme_color VARCHAR(7) DEFAULT '#6366f1',
                    background_color VARCHAR(7) DEFAULT '#ffffff',
                    accent_color VARCHAR(7) DEFAULT '#8b5cf6',
                    primary_color VARCHAR(7) DEFAULT '#6366f1',
                    secondary_color VARCHAR(7) DEFAULT '#64748b',
                    success_color VARCHAR(7) DEFAULT '#10b981',
                    warning_color VARCHAR(7) DEFAULT '#f59e0b',
                    error_color VARCHAR(7) DEFAULT '#ef4444',
                    
                    -- Typography
                    font_family VARCHAR(100) DEFAULT 'Inter',
                    font_size_base INTEGER DEFAULT 16,
                    font_weight_normal INTEGER DEFAULT 400,
                    font_weight_bold INTEGER DEFAULT 600,
                    
                    -- Layout & Design
                    border_radius INTEGER DEFAULT 12,
                    card_shadow VARCHAR(50) DEFAULT 'medium',
                    layout_style VARCHAR(20) DEFAULT 'modern',
                    
                    -- Icons and Images
                    logo_url VARCHAR(500),
                    icon_192_url VARCHAR(500),
                    icon_512_url VARCHAR(500),
                    favicon_url VARCHAR(500),
                    splash_image VARCHAR(500),
                    background_image VARCHAR(500),
                    
                    -- PWA Manifest Settings
                    display VARCHAR(20) DEFAULT 'standalone',
                    orientation VARCHAR(20) DEFAULT 'any',
                    start_url VARCHAR(100) DEFAULT '/',
                    scope VARCHAR(100) DEFAULT '/',
                    
                    -- Content Customization
                    welcome_message TEXT DEFAULT 'Welcome to your appointment portal',
                    welcome_subtitle TEXT,
                    footer_text TEXT,
                    contact_info TEXT,
                    privacy_policy_url VARCHAR(500),
                    terms_of_service_url VARCHAR(500),
                    
                    -- Features Configuration
                    features TEXT, -- JSON field for feature flags
                    
                    -- Branding Configuration
                    branding TEXT, -- JSON field for branding options
                    
                    -- Navigation & Menu
                    navigation_style VARCHAR(20) DEFAULT 'bottom',
                    show_logo BOOLEAN DEFAULT true,
                    show_company_name BOOLEAN DEFAULT true,
                    custom_menu_items TEXT, -- JSON array
                    
                    -- Advanced Customization
                    custom_css TEXT,
                    custom_js TEXT,
                    custom_html_head TEXT,
                    custom_html_body TEXT,
                    
                    -- Analytics & Integrations
                    google_analytics_id VARCHAR(50),
                    google_tag_manager_id VARCHAR(50),
                    facebook_pixel_id VARCHAR(50),
                    hotjar_site_id VARCHAR(50),
                    intercom_app_id VARCHAR(50),
                    
                    -- PWA Advanced Features
                    enable_push_notifications BOOLEAN DEFAULT true,
                    push_notification_settings TEXT, -- JSON
                    enable_offline_mode BOOLEAN DEFAULT true,
                    offline_message TEXT DEFAULT 'You are currently offline',
                    cache_strategy VARCHAR(20) DEFAULT 'cache_first',
                    
                    -- Localization
                    default_language VARCHAR(5) DEFAULT 'en',
                    supported_languages TEXT, -- JSON array
                    rtl_support BOOLEAN DEFAULT false,
                    
                    -- Status and Metadata
                    is_active BOOLEAN DEFAULT true,
                    is_published BOOLEAN DEFAULT false,
                    published_at DATETIME,
                    version_number INTEGER DEFAULT 1,
                    
                    -- Timestamps
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    
                    -- Constraints
                    FOREIGN KEY (organization_id) REFERENCES organizations (id),
                    UNIQUE(organization_id)
                )
            """)
            print("✅ Created pwa_configs table")
        else:
            print("📝 Updating existing pwa_configs table...")
            
            # Get current table structure
            cursor.execute("PRAGMA table_info(pwa_configs)")
            columns = [row[1] for row in cursor.fetchall()]
            
            # Add new columns if they don't exist
            new_columns = [
                ("organization_id", "INTEGER"),
                ("app_short_name", "VARCHAR(12)"),
                ("success_color", "VARCHAR(7) DEFAULT '#10b981'"),
                ("warning_color", "VARCHAR(7) DEFAULT '#f59e0b'"),
                ("error_color", "VARCHAR(7) DEFAULT '#ef4444'"),
                ("font_family", "VARCHAR(100) DEFAULT 'Inter'"),
                ("font_size_base", "INTEGER DEFAULT 16"),
                ("font_weight_normal", "INTEGER DEFAULT 400"),
                ("font_weight_bold", "INTEGER DEFAULT 600"),
                ("border_radius", "INTEGER DEFAULT 12"),
                ("card_shadow", "VARCHAR(50) DEFAULT 'medium'"),
                ("layout_style", "VARCHAR(20) DEFAULT 'modern'"),
                ("favicon_url", "VARCHAR(500)"),
                ("background_image", "VARCHAR(500)"),
                ("display", "VARCHAR(20) DEFAULT 'standalone'"),
                ("scope", "VARCHAR(100) DEFAULT '/'"),
                ("welcome_subtitle", "TEXT"),
                ("footer_text", "TEXT"),
                ("contact_info", "TEXT"),
                ("privacy_policy_url", "VARCHAR(500)"),
                ("terms_of_service_url", "VARCHAR(500)"),
                ("features", "TEXT"),
                ("branding", "TEXT"),
                ("navigation_style", "VARCHAR(20) DEFAULT 'bottom'"),
                ("show_logo", "BOOLEAN DEFAULT true"),
                ("show_company_name", "BOOLEAN DEFAULT true"),
                ("custom_menu_items", "TEXT"),
                ("custom_html_head", "TEXT"),
                ("custom_html_body", "TEXT"),
                ("google_tag_manager_id", "VARCHAR(50)"),
                ("hotjar_site_id", "VARCHAR(50)"),
                ("intercom_app_id", "VARCHAR(50)"),
                ("enable_push_notifications", "BOOLEAN DEFAULT true"),
                ("push_notification_settings", "TEXT"),
                ("enable_offline_mode", "BOOLEAN DEFAULT true"),
                ("offline_message", "TEXT DEFAULT 'You are currently offline'"),
                ("cache_strategy", "VARCHAR(20) DEFAULT 'cache_first'"),
                ("default_language", "VARCHAR(5) DEFAULT 'en'"),
                ("supported_languages", "TEXT"),
                ("rtl_support", "BOOLEAN DEFAULT false"),
                ("is_active", "BOOLEAN DEFAULT true"),
                ("is_published", "BOOLEAN DEFAULT false"),
                ("published_at", "DATETIME"),
                ("version_number", "INTEGER DEFAULT 1"),
            ]
            
            for column_name, column_def in new_columns:
                if column_name not in columns:
                    try:
                        cursor.execute(f"ALTER TABLE pwa_configs ADD COLUMN {column_name} {column_def}")
                        print(f"✅ Added column: {column_name}")
                    except sqlite3.Error as e:
                        print(f"⚠️ Could not add column {column_name}: {e}")
            
            # Update provider_id to organization_id if needed
            if "provider_id" in columns and "organization_id" not in columns:
                cursor.execute("ALTER TABLE pwa_configs ADD COLUMN organization_id INTEGER")
                # Copy provider organization_id to pwa_configs
                cursor.execute("""
                    UPDATE pwa_configs 
                    SET organization_id = (
                        SELECT organization_id 
                        FROM providers 
                        WHERE providers.id = pwa_configs.provider_id
                    )
                """)
                print("✅ Migrated provider_id to organization_id")
        
        # Create indexes for better performance
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_pwa_configs_organization_id ON pwa_configs(organization_id)",
            "CREATE INDEX IF NOT EXISTS idx_pwa_configs_is_active ON pwa_configs(is_active)",
            "CREATE INDEX IF NOT EXISTS idx_pwa_configs_is_published ON pwa_configs(is_published)",
        ]
        
        for index_sql in indexes:
            cursor.execute(index_sql)
        
        print("✅ Created database indexes")
        
        # Commit changes
        conn.commit()
        print("✅ PWA configuration migration completed successfully!")
        
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    success = migrate_pwa_config()
    sys.exit(0 if success else 1)
