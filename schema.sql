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
    status VARCHAR(50) DEFAULT 'pending',
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

-- 4. Seed Default Admin User
INSERT INTO users (id, full_name, email, role, verified, provider)
VALUES ('admin_01', 'Platform Administrator', 'admin@stayinkonkan.com', 'admin', true, 'email')
ON CONFLICT (email) DO NOTHING;

-- 5. Create Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);

-- 6. Create Cancellations & Cancel Bookings Tables
CREATE TABLE IF NOT EXISTS cancellations (
    id VARCHAR(255) PRIMARY KEY,
    booking_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    property_name VARCHAR(255),
    check_in VARCHAR(100),
    check_out VARCHAR(100),
    paid_amount NUMERIC(10, 2) DEFAULT 0,
    refund_amount NUMERIC(10, 2) DEFAULT 0,
    refund_percentage INT DEFAULT 0,
    notice_days INT DEFAULT 0,
    cancellation_reason TEXT DEFAULT 'Guest requested cancellation',
    status VARCHAR(50) DEFAULT 'requested',
    refund_status VARCHAR(50) DEFAULT 'pending',
    refund_txn_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cancellations_booking_id ON cancellations(booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_user_email ON cancellations(user_email);

CREATE TABLE IF NOT EXISTS cancel_bookings (
    id VARCHAR(255) PRIMARY KEY,
    booking_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    property_name VARCHAR(255),
    check_in VARCHAR(100),
    check_out VARCHAR(100),
    paid_amount NUMERIC(10, 2) DEFAULT 0,
    refund_amount NUMERIC(10, 2) DEFAULT 0,
    refund_percentage INT DEFAULT 0,
    notice_days INT DEFAULT 0,
    cancellation_reason TEXT DEFAULT 'Guest requested cancellation',
    status VARCHAR(50) DEFAULT 'requested',
    refund_status VARCHAR(50) DEFAULT 'pending',
    refund_txn_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cancel_bookings_booking_id ON cancel_bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_cancel_bookings_user_email ON cancel_bookings(user_email);

-- 7. Create Subadmins Table
CREATE TABLE IF NOT EXISTS subadmins (
    id VARCHAR(255) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'subadmin',
    permissions TEXT DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subadmins_email ON subadmins(email);
CREATE INDEX IF NOT EXISTS idx_subadmins_role ON subadmins(role);

-- 8. Create Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    discount_type VARCHAR(50) DEFAULT 'percentage',
    discount_value NUMERIC(10, 2) NOT NULL,
    min_booking NUMERIC(10, 2) DEFAULT 0,
    apply_to VARCHAR(100) DEFAULT 'All Products',
    max_uses INT DEFAULT 100,
    times_used INT DEFAULT 0,
    active BOOLEAN DEFAULT true,
    is_private BOOLEAN DEFAULT false,
    expiry VARCHAR(50) DEFAULT '2026-12-31',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);



