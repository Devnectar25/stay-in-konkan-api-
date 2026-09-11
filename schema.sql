-- ====================================================================
-- STAY IN KONKAN - COMPLETE SUPABASE POSTGRESQL SCHEMA
-- Project ID: xewkclgttvhuunxqjpyj
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- TABLE DEFINITIONS
-- ====================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(255) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(100),
    role VARCHAR(50) DEFAULT 'guest',
    provider VARCHAR(50) DEFAULT 'email',
    verified BOOLEAN DEFAULT false,
    password_hash TEXT,
    bank_details TEXT,
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    account_holder_name VARCHAR(255),
    ifsc_code VARCHAR(50),
    account_type VARCHAR(50) DEFAULT 'savings',
    upi_id VARCHAR(100),
    branch_name VARCHAR(255),
    location VARCHAR(255),
    total_properties INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 2. Hosts Table
CREATE TABLE IF NOT EXISTS public.hosts (
    id VARCHAR(255) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(100),
    location VARCHAR(255),
    total_properties INT DEFAULT 0,
    verified BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'active',
    bank_details TEXT,
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    account_holder_name VARCHAR(255),
    ifsc_code VARCHAR(50),
    account_type VARCHAR(50) DEFAULT 'Savings',
    upi_id VARCHAR(100),
    branch_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hosts_email ON public.hosts(email);
CREATE INDEX IF NOT EXISTS idx_hosts_status ON public.hosts(status);

-- 3. Host Accounts Table (Admin & Host views)
CREATE TABLE IF NOT EXISTS public.host_accounts (
    id VARCHAR(255) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(100),
    location VARCHAR(255),
    total_properties INT DEFAULT 0,
    verified BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'active',
    bank_name VARCHAR(255),
    account_number VARCHAR(255),
    account_holder_name VARCHAR(255),
    ifsc_code VARCHAR(50),
    upi_id VARCHAR(255),
    branch_name VARCHAR(255),
    account_type VARCHAR(50) DEFAULT 'Savings',
    payout_status VARCHAR(50) DEFAULT 'eligible',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_host_accounts_email ON public.host_accounts(email);
CREATE INDEX IF NOT EXISTS idx_host_accounts_status ON public.host_accounts(status);

-- 4. Properties Table
CREATE TABLE IF NOT EXISTS public.properties (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    location VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    price_per_night NUMERIC(10, 2) NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 4.5,
    reviews_count INT DEFAULT 0,
    image_url TEXT,
    owner_id VARCHAR(255) REFERENCES public.users(id) ON DELETE SET NULL,
    owner_name VARCHAR(255),
    owner_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'approved',
    amenities TEXT,
    host_name VARCHAR(255),
    host_email VARCHAR(255),
    host_phone VARCHAR(255),
    host_languages VARCHAR(255),
    facility1_image TEXT,
    facility2_image TEXT,
    facility3_image TEXT,
    rooms JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_properties_location ON public.properties(location);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at DESC);

-- 5. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
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
    confirmation_email_sent BOOLEAN DEFAULT FALSE,
    host_email_sent BOOLEAN DEFAULT FALSE,
    last_emailed_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_user_email ON public.bookings(user_email);
CREATE INDEX IF NOT EXISTS idx_bookings_host_email ON public.bookings(host_email);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON public.bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);

-- 6. Cancellations Table
CREATE TABLE IF NOT EXISTS public.cancellations (
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
    bank_name VARCHAR(255),
    account_holder_name VARCHAR(255),
    account_number VARCHAR(100),
    ifsc_code VARCHAR(50),
    upi_id VARCHAR(100),
    refund_emailed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cancellations_booking_id ON public.cancellations(booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_user_email ON public.cancellations(user_email);

-- 7. Subadmins Table
CREATE TABLE IF NOT EXISTS public.subadmins (
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
CREATE INDEX IF NOT EXISTS idx_subadmins_email ON public.subadmins(email);

-- 8. Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
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
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);

-- 9. Help Desk Table
CREATE TABLE IF NOT EXISTS public.help_desk (
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
CREATE INDEX IF NOT EXISTS idx_help_desk_created_at ON public.help_desk(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_desk_status ON public.help_desk(status);
CREATE INDEX IF NOT EXISTS idx_help_desk_priority ON public.help_desk(priority);
CREATE INDEX IF NOT EXISTS idx_help_desk_user_email ON public.help_desk(user_email);

-- 10. Issue View (Backward compatibility for frontend queries)
CREATE OR REPLACE VIEW public.issue AS SELECT * FROM public.help_desk;

-- 11. Application Errors Table
CREATE TABLE IF NOT EXISTS public.application_errors (
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
CREATE INDEX IF NOT EXISTS idx_app_errors_created_at ON public.application_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_severity ON public.application_errors(severity);
CREATE INDEX IF NOT EXISTS idx_app_errors_status ON public.application_errors(status);

-- 12. Wishlists Table
CREATE TABLE IF NOT EXISTS public.wishlists (
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
CREATE INDEX IF NOT EXISTS idx_wishlists_user_email ON public.wishlists(user_email);
CREATE INDEX IF NOT EXISTS idx_wishlists_property_id ON public.wishlists(property_id);

-- 13. Contact Messages Table
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255) DEFAULT 'General Inquiry',
    message TEXT NOT NULL,
    unread BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON public.contact_messages(email);
CREATE INDEX IF NOT EXISTS idx_contact_messages_unread ON public.contact_messages(unread);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);

-- 14. Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers(email);

-- 15. Platform Config Table
CREATE TABLE IF NOT EXISTS public.platform_config (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'default',
    key VARCHAR(100) UNIQUE,
    value JSONB DEFAULT '{}'::jsonb,
    token_percentage NUMERIC(5, 2) DEFAULT 20.00,
    service_fee_percentage NUMERIC(5, 2) DEFAULT 5.00,
    min_advance_percentage NUMERIC(5, 2) DEFAULT 20.00,
    platform_name VARCHAR(255) DEFAULT 'Stay in Konkan',
    contact_email VARCHAR(255) DEFAULT 'support@stayinkonkan.com',
    contact_phone VARCHAR(50) DEFAULT '+91 98000 00000',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Bank Details Table
CREATE TABLE IF NOT EXISTS public.bank_details (
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
CREATE INDEX IF NOT EXISTS idx_bank_details_user_email ON public.bank_details(user_email);

-- 17. Host Applications Table
CREATE TABLE IF NOT EXISTS public.host_applications (
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
    property_doc_url TEXT,
    gst_doc_url TEXT,
    identity_doc_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    last_emailed_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_host_applications_email ON public.host_applications(applicant_email);

-- 18. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id VARCHAR(255) PRIMARY KEY,
    property_id VARCHAR(255) NOT NULL,
    guest_name VARCHAR(255),
    user_email VARCHAR(255),
    rating NUMERIC(3, 1) DEFAULT 5,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON public.reviews(property_id);

-- 19. OTP Codes Table (Password reset & verification)
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(20) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    expiry BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);

-- 20. Booking Email Logs
CREATE TABLE IF NOT EXISTS public.booking_email_logs (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    delivery_method VARCHAR(50),
    message_id VARCHAR(255),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. Host Application Email Logs
CREATE TABLE IF NOT EXISTS public.host_application_email_logs (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    delivery_method VARCHAR(50),
    message_id VARCHAR(255),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. Host Booking Email Logs
CREATE TABLE IF NOT EXISTS public.host_booking_email_logs (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(255) NOT NULL,
    host_email VARCHAR(255) NOT NULL,
    property_name VARCHAR(255),
    subject VARCHAR(255),
    delivery_method VARCHAR(50),
    message_id VARCHAR(255),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. Host Notifications Table
CREATE TABLE IF NOT EXISTS public.host_notifications (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(255) NOT NULL,
    host_email VARCHAR(255) NOT NULL,
    property_name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'new_booking',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_host_notifications_host_email ON public.host_notifications(host_email);

-- 24. Refund Email Logs
CREATE TABLE IF NOT EXISTS public.refund_email_logs (
    id SERIAL PRIMARY KEY,
    cancellation_id VARCHAR(255),
    booking_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    refund_amount NUMERIC(10, 2),
    refund_txn_id VARCHAR(255),
    delivery_method VARCHAR(50),
    message_id VARCHAR(255),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- SEED INITIAL CONFIG & DEFAULT DATA
-- ====================================================================

-- Seed Admin User
INSERT INTO public.users (id, full_name, email, role, verified, provider)
VALUES ('admin_01', 'Platform Administrator', 'admin@stayinkonkan.com', 'admin', true, 'email')
ON CONFLICT (email) DO UPDATE SET role = 'admin', verified = true;

-- Seed Platform Config
INSERT INTO public.platform_config (id, key, token_percentage, service_fee_percentage, min_advance_percentage, platform_name, contact_email, contact_phone)
VALUES ('default', 'general_settings', 20.00, 5.00, 20.00, 'Stay in Konkan', 'support@stayinkonkan.com', '+91 98000 00000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_config (id, key, token_percentage, service_fee_percentage, min_advance_percentage, platform_name, contact_email, contact_phone)
VALUES ('global', 'platform_settings', 20.00, 5.00, 20.00, 'Stay in Konkan', 'support@stayinkonkan.com', '+91 98000 00000')
ON CONFLICT (id) DO NOTHING;

-- Seed Default Coupons
INSERT INTO public.coupons (id, code, discount_type, discount_value, min_booking, apply_to, max_uses, times_used, active, is_private, expiry)
VALUES
  ('COUP-1', 'SUMMER25', 'percentage', 25, 1500, 'All Products', 100, 14, true, false, '2026-12-31'),
  ('COUP-2', 'WELCOME500', 'flat', 500, 1500, 'First Time Guests', 50, 8, true, false, '2026-09-30'),
  ('COUP-3', 'KONKAN10', 'percentage', 10, 1000, 'All Products', 200, 42, true, false, '2026-12-31')
ON CONFLICT (code) DO NOTHING;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) & ACCESS PERMISSIONS
-- Grants full access for web app, API serverless functions & client SDK
-- ====================================================================
DO $$
DECLARE
    t text;
    tbls text[] := ARRAY[
      'users', 'hosts', 'host_accounts', 'properties', 'bookings',
      'cancellations', 'subadmins', 'coupons', 'help_desk', 'application_errors',
      'wishlists', 'contact_messages', 'newsletter_subscribers', 'platform_config',
      'bank_details', 'host_applications', 'reviews', 'otp_codes',
      'booking_email_logs', 'host_application_email_logs', 'host_booking_email_logs',
      'host_notifications', 'refund_email_logs'
    ];
BEGIN
    FOREACH t IN ARRAY tbls LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public full access on %I" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Public full access on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t, t);
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role;', t);
    END LOOP;
END $$;

-- ====================================================================
-- DATABASE TRIGGERS
-- ====================================================================

-- 1. Auto updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_help_desk_updated_at ON public.help_desk;
CREATE TRIGGER set_help_desk_updated_at
BEFORE UPDATE ON public.help_desk
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Supabase Auth sync trigger (syncs auth.users to public.users on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, provider, verified)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- SUPABASE STORAGE BUCKETS SETUP
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('properties', 'properties', true),
  ('host-applications', 'host-applications', true),
  ('avatars', 'avatars', true),
  ('documents', 'documents', true),
  ('wishlists', 'wishlists', true),
  ('issues', 'issues', true)
ON CONFLICT (id) DO NOTHING;

-- Storage public read and write access policy
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    CREATE POLICY "Public Access" ON storage.objects
    FOR ALL
    USING (bucket_id IN ('properties', 'host-applications', 'avatars', 'documents', 'wishlists', 'issues'))
    WITH CHECK (bucket_id IN ('properties', 'host-applications', 'avatars', 'documents', 'wishlists', 'issues'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
