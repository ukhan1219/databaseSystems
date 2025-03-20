-- ======================================================
-- 0. Definitions replaced with MySQL/MariaDB-style enums
-- ======================================================
-- There's no CREATE TYPE in MySQL/MariaDB; you define ENUM on columns directly.

-- ======================================================
-- 1. University Table
-- ======================================================
CREATE TABLE IF NOT EXISTS university (
    university_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    number_of_students INT,
    pictures VARCHAR(512)
);

-- ======================================================
-- 2. Users Table
-- ======================================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'student') NOT NULL DEFAULT 'student',
    university_id INT,
    CONSTRAINT fk_users_university FOREIGN KEY (university_id) 
        REFERENCES university (university_id) 
        ON DELETE SET NULL
);

-- ======================================================
-- 3. RSO Table
-- ======================================================
CREATE TABLE IF NOT EXISTS rso (
    rso_id INT AUTO_INCREMENT PRIMARY KEY,
    rso_name VARCHAR(255) NOT NULL,
    description TEXT,
    admin_user_id INT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_rso_admin FOREIGN KEY (admin_user_id) 
        REFERENCES users (user_id) 
        ON DELETE CASCADE
);

-- ======================================================
-- 4. RSO Membership Table
-- ======================================================
CREATE TABLE IF NOT EXISTS rso_membership (
    user_id INT NOT NULL,
    rso_id INT NOT NULL,
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, rso_id),
    CONSTRAINT fk_rso_membership_user FOREIGN KEY (user_id) 
        REFERENCES users (user_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_rso_membership_rso FOREIGN KEY (rso_id) 
        REFERENCES rso (rso_id) 
        ON DELETE CASCADE
);

-- ======================================================
-- 5. Event Table
-- ======================================================
CREATE TABLE IF NOT EXISTS event (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_type ENUM('public','private','rso') NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    event_description TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location_name VARCHAR(255),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    rso_id INT,
    university_id INT,
    approved_by INT,
    CONSTRAINT fk_event_rso FOREIGN KEY (rso_id) 
        REFERENCES rso (rso_id) 
        ON DELETE SET NULL,
    CONSTRAINT fk_event_university FOREIGN KEY (university_id) 
        REFERENCES university (university_id) 
        ON DELETE SET NULL,
    CONSTRAINT fk_event_approved_by FOREIGN KEY (approved_by) 
        REFERENCES users (user_id) 
        ON DELETE SET NULL
);

-- ======================================================
-- 6. Comment Table
-- ======================================================
CREATE TABLE IF NOT EXISTS comment (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_comment_event FOREIGN KEY (event_id) 
        REFERENCES event (event_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_comment_user FOREIGN KEY (user_id) 
        REFERENCES users (user_id) 
        ON DELETE CASCADE
);

-- ======================================================
-- 7. Rating Table
-- ======================================================
CREATE TABLE IF NOT EXISTS rating (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    rating_value INT,
    CONSTRAINT chk_rating_value CHECK (rating_value BETWEEN 1 AND 5),
    CONSTRAINT fk_rating_event FOREIGN KEY (event_id) 
        REFERENCES event (event_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_rating_user FOREIGN KEY (user_id) 
        REFERENCES users (user_id) 
        ON DELETE CASCADE,
    CONSTRAINT unique_event_user UNIQUE (event_id, user_id)
);
