# Changelog — Stay In Konkan (Backend API)

All notable changes to the backend API will be documented here.

---

## [Unreleased]

### Added
- `.env` configuration file for local development
- PostgreSQL connection via Supabase (raw `pg` queries)
- Cancellations API with auto table creation
- Wishlist routes
- Review routes
- Host application routes
- Newsletter & contact routes

### Fixed
- CORS configured to allow all origins for dev
- SSL handling for Supabase cloud connections

---

## [1.0.0] - 2026-08-03
### Initial Release
- Express server with `--watch` mode for dev
- User authentication routes
- Property CRUD routes
- Booking management routes
- Admin routes
- Vercel serverless deployment support
