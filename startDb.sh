#!/bin/bash
echo "Starting MariaDB container..."
docker-compose up -d
echo "Database is now running on localhost:3306"
echo "Username: dbuser"
echo "Password: dbpassword"
echo "Database: event_system"