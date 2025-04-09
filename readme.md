# University Event Management System

This project is a full-stack web application for managing university events, RSOs (Registered Student Organizations), and user interactions.

## Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/) (which includes npm)
*   [Docker](https://www.docker.com/get-started/)
*   [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)

## Setup Instructions

Follow these steps to get the application running locally:

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Start the Database:**
    *   The application uses a MariaDB database managed by Docker.
    *   Navigate to the project root directory.
    *   Run the provided script to start the database container in detached mode:
        ```bash
        ./startDb.sh
        ```
    *   Alternatively, you can use Docker Compose directly:
        ```bash
        docker-compose up -d
        ```
    *   On the first run, Docker Compose will use the `backend/init.sql` script to set up the database schema and create the necessary tables.
    *   **Database Connection Details:**
        *   Host: `localhost`
        *   Port: `3306`
        *   Username: `dbuser`
        *   Password: `dbpassword`
        *   Database Name: `event_system`

3.  **Configure Backend:**
    *   Navigate to the backend directory:
        ```bash
        cd backend
        ```
    *   Create a `.env` file by copying the example:
        ```bash
        cp .env.example .env
        ```
    *   **Important:** Open the `.env` file and fill in the required environment variables. See the [Environment Variables](#environment-variables) section below for details. You'll need to set the database credentials (which match the defaults in `docker-compose.yml` unless you changed them) and generate secrets for `SESSION_SECRET` and `JWT_SECRET`.
    *   Install backend dependencies:
        ```bash
        npm install
        ```

4.  **Configure Frontend:**
    *   Navigate to the frontend directory from the project root:
        ```bash
        cd ../frontend
        # Or just `cd frontend` if you are already in the root
        ```
    *   Install frontend dependencies:
        ```bash
        npm install
        ```

## Running the Application

You need to run both the backend and frontend servers concurrently.

1.  **Run the Backend Server:**
    *   Open a terminal in the `backend` directory.
    *   Start the server (with automatic restarts on file changes using nodemon):
        ```bash
        npm run dev
        ```
    *   Or, for production mode (though `dev` is usually preferred for local development):
        ```bash
        npm start
        ```
    *   The backend server will typically run on the port specified in your `backend/.env` file (default might be 3000 or 5000, check `server.js` or `.env`).

2.  **Run the Frontend Development Server:**
    *   Open another terminal in the `frontend` directory.
    *   Start the Vite development server:
        ```bash
        npm run dev
        ```
    *   Vite will typically output the URL where the frontend is being served (usually `http://localhost:5173`).

3.  **Access the Application:**
    *   Open your web browser and navigate to the URL provided by the frontend Vite server (e.g., `http://localhost:5173`).

## Environment Variables (`backend/.env`)

The backend requires the following environment variables. Create a `.env` file in the `backend` directory and set these values:

```plaintext
# Database Configuration
DB_HOST=localhost         # Or the IP/hostname if your DB is elsewhere
DB_USER=dbuser            # Matches docker-compose.yml
DB_PASSWORD=dbpassword    # Matches docker-compose.yml
DB_NAME=event_system      # Matches docker-compose.yml
DB_PORT=3306              # Matches docker-compose.yml

# Application Secrets (Generate strong random strings for these)
SESSION_SECRET=your_strong_session_secret_here
JWT_SECRET=your_strong_jwt_secret_here

# Server Port
PORT=5000                 # Or any other port for the backend API
```
*Replace `your_strong_session_secret_here` and `your_strong_jwt_secret_here` with actual secure, random strings.*

## Available Scripts

### Root Directory

*   `startDb.sh`: Starts the MariaDB Docker container using `docker-compose up -d`.
*   `migration.sh`: **Warning: Destructive!** Stops the database container, removes the data volume (deleting all data), restarts the container, and re-initializes the database using `backend/init.sql`. Use this to reset the database to a clean state.

### Backend (`backend/`)

*   `npm install`: Installs backend dependencies.
*   `npm start`: Starts the backend server using `node server.js`.
*   `npm run dev`: Starts the backend server using `nodemon server.js` for development (auto-restarts on changes).
*   `npm test`: (Currently prints an error message - needs test implementation).

### Frontend (`frontend/`)

*   `npm install`: Installs frontend dependencies.
*   `npm run dev`: Starts the frontend development server using Vite.
*   `npm run build`: Builds the frontend application for production.
*   `npm run lint`: Lints the frontend code using ESLint.
*   `npm run preview`: Serves the production build locally for previewing.