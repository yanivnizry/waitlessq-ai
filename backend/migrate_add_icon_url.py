#!/usr/bin/env python3
"""
Migration script to add icon_url column to pwa_configs table
"""

import sqlite3
import os
from pathlib import Path

def main():
    # Get the database path
    db_path = Path(__file__).parent / "waitlessq.db"
    
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        return
    
    print(f"📁 Database found at: {db_path}")
    
    try:
        # Connect to the database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if the column already exists
        cursor.execute("PRAGMA table_info(pwa_configs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'icon_url' in columns:
            print("✅ Column 'icon_url' already exists in pwa_configs table")
            return
        
        print("📝 Adding icon_url column to pwa_configs table...")
        
        # Add the icon_url column
        cursor.execute("""
            ALTER TABLE pwa_configs 
            ADD COLUMN icon_url VARCHAR(500)
        """)
        
        # Commit the changes
        conn.commit()
        print("✅ Successfully added icon_url column to pwa_configs table")
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(pwa_configs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'icon_url' in columns:
            print("✅ Verification successful: icon_url column exists")
        else:
            print("❌ Verification failed: icon_url column not found")
            
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        if conn:
            conn.close()
            print("📝 Database connection closed")

if __name__ == "__main__":
    main()
