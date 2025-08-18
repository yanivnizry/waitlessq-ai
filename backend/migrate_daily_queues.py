#!/usr/bin/env python3
"""
Migration script to add daily queue functionality.

Adds:
- queue_id column to appointments table
- service_name and queue_date columns to queues table
"""

import sqlite3
import sys
from pathlib import Path

def migrate_database():
    """Apply database migrations for daily queue functionality"""
    
    # Database path
    db_path = Path(__file__).parent / "waitlessq.db"
    
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        print("Please run the application first to create the database.")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔄 Starting migration for daily queues...")
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(appointments)")
        appointment_columns = [row[1] for row in cursor.fetchall()]
        
        cursor.execute("PRAGMA table_info(queues)")
        queue_columns = [row[1] for row in cursor.fetchall()]
        
        migrations_applied = 0
        
        # Add queue_id to appointments table if it doesn't exist
        if 'queue_id' not in appointment_columns:
            print("📅 Adding queue_id column to appointments table...")
            cursor.execute("ALTER TABLE appointments ADD COLUMN queue_id INTEGER")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_appointments_queue_id ON appointments(queue_id)")
            migrations_applied += 1
            print("✅ Added queue_id column to appointments")
        else:
            print("ℹ️  queue_id column already exists in appointments table")
        
        # Add service_name to queues table if it doesn't exist
        if 'service_name' not in queue_columns:
            print("🏷️  Adding service_name column to queues table...")
            cursor.execute("ALTER TABLE queues ADD COLUMN service_name VARCHAR(255)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_queues_service_name ON queues(service_name)")
            migrations_applied += 1
            print("✅ Added service_name column to queues")
        else:
            print("ℹ️  service_name column already exists in queues table")
        
        # Add queue_date to queues table if it doesn't exist
        if 'queue_date' not in queue_columns:
            print("📆 Adding queue_date column to queues table...")
            cursor.execute("ALTER TABLE queues ADD COLUMN queue_date DATE")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_queues_date ON queues(queue_date)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_queues_provider_service_date ON queues(provider_id, service_name, queue_date)")
            migrations_applied += 1
            print("✅ Added queue_date column to queues")
        else:
            print("ℹ️  queue_date column already exists in queues table")
        
        # Commit changes
        conn.commit()
        
        if migrations_applied > 0:
            print(f"🎉 Migration completed successfully! Applied {migrations_applied} changes.")
            print("\n📋 Summary of changes:")
            print("   • Appointments can now be assigned to daily service queues")
            print("   • Queues can be associated with specific services and dates")
            print("   • Automatic queue creation will work on next appointment booking")
        else:
            print("✅ Database is already up to date!")
        
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    success = migrate_database()
    sys.exit(0 if success else 1)
