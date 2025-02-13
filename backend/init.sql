-- ======================================================
-- 0. Create Enum Types for Role and Event Type
-- ======================================================
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'student');

CREATE TYPE event_type AS ENUM ('public', 'private', 'rso');

-- ======================================================
-- 1. University Table
-- ======================================================
CREATE TABLE university (
    university_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    number_of_students INT,
    pictures VARCHAR(512) -- Could store URLs or paths
);

-- ======================================================
-- 2. User Table
--    Note: "user" is a reserved keyword in PostgreSQL.
--          It is recommended to use a different table name (e.g., "users").
-- ======================================================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    university_id INT,
    FOREIGN KEY (university_id) REFERENCES university (university_id) ON DELETE SET NULL
);

-- ======================================================
-- 3. RSO Table
-- ======================================================
CREATE TABLE rso (
    rso_id SERIAL PRIMARY KEY,
    rso_name VARCHAR(255) NOT NULL,
    description TEXT,
    admin_user_id INT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (admin_user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- ======================================================
-- 4. RSO Membership Table
-- ======================================================
CREATE TABLE rso_membership (
    user_id INT NOT NULL,
    rso_id INT NOT NULL,
    joined_date TIMESTAMP DEFAULT NOW (),
    PRIMARY KEY (user_id, rso_id),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (rso_id) REFERENCES rso (rso_id) ON DELETE CASCADE
);

-- ======================================================
-- 5. Event Table
-- ======================================================
CREATE TABLE event (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_type event_type NOT NULL,
    event_category VARCHAR(50) NOT NULL, -- e.g., 'social', 'fundraising', etc.
    event_description TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location_name VARCHAR(255),
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    rso_id INT,
    university_id INT,
    approved_by INT,
    FOREIGN KEY (rso_id) REFERENCES rso (rso_id) ON DELETE SET NULL,
    FOREIGN KEY (university_id) REFERENCES university (university_id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users (user_id) ON DELETE SET NULL
);

-- ======================================================
-- 6. Comment Table
-- ======================================================
CREATE TABLE comment (
    comment_id SERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES event (event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- ======================================================
-- 7. Rating Table
-- ======================================================
CREATE TABLE rating (
    rating_id SERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    rating_value INT,
    CONSTRAINT chk_rating_value CHECK (rating_value BETWEEN 1 AND 5),
    FOREIGN KEY (event_id) REFERENCES event (event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT unique_event_user UNIQUE (event_id, user_id)
);
