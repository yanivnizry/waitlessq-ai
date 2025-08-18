"""
Database migration script to add client invitation fields.
Run this script to add the new invitation system fields to the clients table.
"""

from sqlalchemy import create_engine, text
from app.core.config import settings
import os

DATABASE_URL = settings.DATABASE_URL

def run_migration():
    print("🔄 Starting migration for client invitation system...")
    engine = create_engine(DATABASE_URL)

    with engine.connect() as connection:
        # Add has_account column
        try:
            connection.execute(text("ALTER TABLE clients ADD COLUMN has_account BOOLEAN DEFAULT FALSE"))
            print("✅ Added has_account column to clients")
        except Exception as e:
            if "duplicate column name: has_account" in str(e):
                print("⚠️ has_account column already exists in clients, skipping.")
            else:
                print(f"❌ Error adding has_account to clients: {e}")

        # Add hashed_password column
        try:
            connection.execute(text("ALTER TABLE clients ADD COLUMN hashed_password VARCHAR(255)"))
            print("✅ Added hashed_password column to clients")
        except Exception as e:
            if "duplicate column name: hashed_password" in str(e):
                print("⚠️ hashed_password column already exists in clients, skipping.")
            else:
                print(f"❌ Error adding hashed_password to clients: {e}")

        # Add invitation_token column
        try:
            connection.execute(text("ALTER TABLE clients ADD COLUMN invitation_token VARCHAR(64)"))
            print("✅ Added invitation_token column to clients")
        except Exception as e:
            if "duplicate column name: invitation_token" in str(e):
                print("⚠️ invitation_token column already exists in clients, skipping.")
            else:
                print(f"❌ Error adding invitation_token to clients: {e}")

        # Add invitation_sent_at column
        try:
            connection.execute(text("ALTER TABLE clients ADD COLUMN invitation_sent_at DATETIME"))
            print("✅ Added invitation_sent_at column to clients")
        except Exception as e:
            if "duplicate column name: invitation_sent_at" in str(e):
                print("⚠️ invitation_sent_at column already exists in clients, skipping.")
            else:
                print(f"❌ Error adding invitation_sent_at to clients: {e}")

        # Add invitation_expires_at column
        try:
            connection.execute(text("ALTER TABLE clients ADD COLUMN invitation_expires_at DATETIME"))
            print("✅ Added invitation_expires_at column to clients")
        except Exception as e:
            if "duplicate column name: invitation_expires_at" in str(e):
                print("⚠️ invitation_expires_at column already exists in clients, skipping.")
            else:
                print(f"❌ Error adding invitation_expires_at to clients: {e}")

        # Add account_created_at column
        try:
            connection.execute(text("ALTER TABLE clients ADD COLUMN account_created_at DATETIME"))
            print("✅ Added account_created_at column to clients")
        except Exception as e:
            if "duplicate column name: account_created_at" in str(e):
                print("⚠️ account_created_at column already exists in clients, skipping.")
            else:
                print(f"❌ Error adding account_created_at to clients: {e}")

        # Add last_login_at column
        try:
            connection.execute(text("ALTER TABLE clients ADD COLUMN last_login_at DATETIME"))
            print("✅ Added last_login_at column to clients")
        except Exception as e:
            if "duplicate column name: last_login_at" in str(e):
                print("⚠️ last_login_at column already exists in clients, skipping.")
            else:
                print(f"❌ Error adding last_login_at to clients: {e}")

        # Create index on invitation_token for performance
        try:
            connection.execute(text("CREATE UNIQUE INDEX idx_clients_invitation_token ON clients(invitation_token) WHERE invitation_token IS NOT NULL"))
            print("✅ Created unique index on invitation_token")
        except Exception as e:
            if "already exists" in str(e) or "duplicate" in str(e):
                print("⚠️ Index on invitation_token already exists, skipping.")
            else:
                print(f"❌ Error creating index on invitation_token: {e}")

        connection.commit()
    print("🎉 Client invitation migration completed successfully!")

if __name__ == "__main__":
    db_path = DATABASE_URL.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}. Please run the FastAPI app once to create it.")
    else:
        run_migration()
