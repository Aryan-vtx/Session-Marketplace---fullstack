#!/bin/sh
set -e

echo "Waiting for PostgreSQL database at $DB_HOST:$DB_PORT..."
python -c "
import socket, time, os
host = os.environ.get('DB_HOST', 'db')
port = int(os.environ.get('DB_PORT', 5432))
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
while True:
    try:
        s.connect((host, port))
        s.close()
        break
    except socket.error:
        time.sleep(0.5)
"
echo "PostgreSQL is up and accepting connections!"

echo "Applying database migrations..."
python manage.py makemigrations core
python manage.py migrate --noinput

echo "Starting Django server on 0.0.0.0:8000..."
exec python manage.py runserver 0.0.0.0:8000
