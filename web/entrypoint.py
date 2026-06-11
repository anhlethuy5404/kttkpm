import os
import shutil
import subprocess
import sys
import time
import socket
from pathlib import Path

def wait_for_db(host, port):
    print(f"Waiting for database at {host}:{port}...")
    while True:
        try:
            with socket.create_connection((host, int(port)), timeout=2):
                print("Database is ready!")
                break
        except OSError:
            time.sleep(1)

def main():
    db_host = os.environ.get("DB_HOST")
    db_port = os.environ.get("DB_PORT", "5432")
    if db_host:
        wait_for_db(db_host, db_port)
    else:
        database_path = os.environ.get("DATABASE_PATH")
        if database_path:
            db_path = Path(database_path)
            db_path.parent.mkdir(parents=True, exist_ok=True)
            if not db_path.exists():
                template_path = Path("/app/web/db.sqlite3")
                if template_path.exists():
                    print(f"Database not found at volume mount {db_path}. Copying pre-seeded template...")
                    shutil.copy(template_path, db_path)
                    print("Database template copied successfully.")
                else:
                    print("Database template not found at /app/web/db.sqlite3. An empty database will be initialized.")

    # Run migrations only if RUN_MIGRATIONS is set to True (so we only run it on user-service)
    if os.environ.get("RUN_MIGRATIONS") == "True":
        print("Running database migrations...")
        subprocess.run([sys.executable, "manage.py", "migrate", "--noinput"])

    # Collect static files for production
    print("Collecting static files...")
    subprocess.run([sys.executable, "manage.py", "collectstatic", "--noinput"])

    # Start gunicorn WSGI server on specific port
    port = os.environ.get("PORT", "8000")
    print(f"Starting Gunicorn WSGI server on port {port}...")
    gunicorn_cmd = [
        "gunicorn",
        "ecom_project.wsgi:application",
        "--bind", f"0.0.0.0:{port}",
        "--workers", "3",
        "--timeout", "120"
    ]
    os.execvp("gunicorn", gunicorn_cmd)

if __name__ == "__main__":
    main()
