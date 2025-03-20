#!/bin/bash
echo "Stopping database..."
docker-compose down
echo "Removing database volume..."
docker volume rm databasesystems_db_data
echo "Starting fresh database..."
docker-compose up -d
echo "Waiting for database to initialize..."
sleep 10  # Wait for MariaDB to fully start
echo "Running initialization script..."
docker exec -i event_system_db mariadb -udbuser -pdbpassword event_system < ./backend/init.sql
echo "Database reset complete."