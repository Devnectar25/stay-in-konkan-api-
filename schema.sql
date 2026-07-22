-- ====================================================================
-- STAY IN KONKAN DATABASE SCHEMA FOR POSTGRESQL
-- ====================================================================

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'guest',
    provider VARCHAR(50) DEFAULT 'email',
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search & lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Create Properties Table
CREATE TABLE IF NOT EXISTS properties (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    price_per_night NUMERIC(10, 2) NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 4.5,
    reviews_count INT DEFAULT 0,
    image_url TEXT,
    owner_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    property_id VARCHAR(255) REFERENCES properties(id) ON DELETE CASCADE,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests INT DEFAULT 1,
    total_price NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
