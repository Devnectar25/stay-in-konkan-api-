import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'stay_in_konkan_jwt_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a JWT token for a user or session
 * @param {Object} payload - Data to encode in token (e.g. { id, email, role })
 * @param {Object} [options] - Additional jwt.sign options
 * @returns {string} Signed JWT Token
 */
export function generateToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    ...options
  });
}

/**
 * Verify a JWT token
 * @param {string} token - Token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('[JWT Verification Error]:', error.message);
    return null;
  }
}

/**
 * Express Middleware for verifying JWT Bearer Token in HTTP Authorization headers.
 */
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing or malformed Authorization header (Bearer token required).'
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Token is invalid or expired.'
    });
  }

  req.user = decoded;
  next();
}

export default {
  generateToken,
  verifyToken,
  authenticateJWT
};
