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
    booking_id VARCHAR(255),
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    guest_email VARCHAR(255),
    user_name VARCHAR(255),
    guest_name VARCHAR(255),
    user_phone VARCHAR(255),
    guest_phone VARCHAR(255),
    property_id VARCHAR(255),
    property_name VARCHAR(255),
    property_title VARCHAR(255),
    host_email VARCHAR(255),
    host_name VARCHAR(255),
    check_in VARCHAR(255),
    check_out VARCHAR(255),
    guests VARCHAR(255),
    rooms VARCHAR(100),
    total_amount NUMERIC(10, 2) DEFAULT 0,
    total_price NUMERIC(10, 2) DEFAULT 0,
    paid_amount NUMERIC(10, 2) DEFAULT 0,
    remaining_amount NUMERIC(10, 2) DEFAULT 0,
    payment_id VARCHAR(255),
    payment_status VARCHAR(100) DEFAULT 'completed',
    status VARCHAR(50) DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user_email ON bookings(user_email);
CREATE INDEX IF NOT EXISTS idx_bookings_host_email ON bookings(host_email);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);


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

-- 9. Create Help Desk Table
CREATE TABLE IF NOT EXISTS help_desk (
    id VARCHAR(255) PRIMARY KEY,
    issue_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'General',
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    user_phone VARCHAR(50),
    priority VARCHAR(50) DEFAULT 'Medium',
    status VARCHAR(50) DEFAULT 'Open',
    admin_notes TEXT,
    comments TEXT DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_help_desk_created_at ON help_desk(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_desk_status ON help_desk(status);
CREATE INDEX IF NOT EXISTS idx_help_desk_priority ON help_desk(priority);
CREATE INDEX IF NOT EXISTS idx_help_desk_user_email ON help_desk(user_email);


-- 10. Create Application Errors Table
CREATE TABLE IF NOT EXISTS application_errors (
    id VARCHAR(255) PRIMARY KEY,
    error_id VARCHAR(255) UNIQUE NOT NULL,
    message TEXT NOT NULL,
    error_type VARCHAR(100) DEFAULT 'UnhandledError',
    stack_trace TEXT,
    endpoint TEXT,
    http_method VARCHAR(20),
    status_code INT DEFAULT 500,
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    browser TEXT,
    device TEXT,
    environment VARCHAR(50) DEFAULT 'production',
    severity VARCHAR(50) DEFAULT 'Medium',
    status VARCHAR(50) DEFAULT 'New',
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    developer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_errors_created_at ON application_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_severity ON application_errors(severity);
CREATE INDEX IF NOT EXISTS idx_app_errors_status ON application_errors(status);

-- 12. Create Wishlists Table
CREATE TABLE IF NOT EXISTS wishlists (
    id VARCHAR(255) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    property_id VARCHAR(255) NOT NULL,
    property_title VARCHAR(255),
    property_image TEXT,
    property_location VARCHAR(255),
    property_price VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_email ON wishlists(user_email);
CREATE INDEX IF NOT EXISTS idx_wishlists_property_id ON wishlists(property_id);

-- 13. Create Contact Messages Table
CREATE TABLE IF NOT EXISTS contact_messages (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255) DEFAULT 'General Inquiry',
    message TEXT NOT NULL,
    unread BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email);
CREATE INDEX IF NOT EXISTS idx_contact_messages_unread ON contact_messages(unread);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- 14. Create Platform Config Table
CREATE TABLE IF NOT EXISTS platform_config (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'default',
    key VARCHAR(100) UNIQUE,
    value JSONB DEFAULT '{}'::jsonb,
    token_percentage NUMERIC(5, 2) DEFAULT 20.00,
    service_fee_percentage NUMERIC(5, 2) DEFAULT 5.00,
    min_advance_percentage NUMERIC(5, 2) DEFAULT 20.00,
    contact_email VARCHAR(255) DEFAULT 'support@stayinkonkan.com',
    contact_phone VARCHAR(50) DEFAULT '+91 98000 00000',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Initial Default Platform Config
INSERT INTO platform_config (id, key, token_percentage, service_fee_percentage, min_advance_percentage, contact_email, contact_phone)
VALUES ('default', 'general_settings', 20.00, 5.00, 20.00, 'support@stayinkonkan.com', '+91 98000 00000')
ON CONFLICT (id) DO NOTHING;

-- 15. Create Bank Details Table
CREATE TABLE IF NOT EXISTS bank_details (
    id VARCHAR(255) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    account_holder_name VARCHAR(255),
    user_type VARCHAR(50) DEFAULT 'user',
    bank_name VARCHAR(255),
    account_number VARCHAR(255),
    ifsc_code VARCHAR(50),
    upi_id VARCHAR(255),
    branch_name VARCHAR(255),
    account_type VARCHAR(50) DEFAULT 'savings',
    is_primary BOOLEAN DEFAULT true,
    verified_status VARCHAR(50) DEFAULT 'verified',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_details_user_email ON bank_details(user_email);

-- 16. Create Host Applications Table
CREATE TABLE IF NOT EXISTS host_applications (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255),
    applicant_name VARCHAR(255),
    applicant_email VARCHAR(255),
    phone VARCHAR(255),
    location VARCHAR(255),
    property_type VARCHAR(255),
    description TEXT,
    custom_property_name VARCHAR(255),
    property_doc_name VARCHAR(255),
    gst_doc_name VARCHAR(255),
    identity_doc_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_host_applications_email ON host_applications(applicant_email);

-- 17. Create Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(255) PRIMARY KEY,
    property_id VARCHAR(255) NOT NULL,
    guest_name VARCHAR(255),
    user_email VARCHAR(255),
    rating NUMERIC(3, 1) DEFAULT 5,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON reviews(property_id);

-- 18. Create Coupons Table
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

