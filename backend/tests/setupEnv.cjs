const path = require('path');

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// Keep token signing (utils/auth.js reads process.env) and verification
// (config/env.js, mocked in tests) consistent.
process.env.JWT_SECRET = process.env.TEST_JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.TEST_JWT_SECRET || 'test-jwt-refresh-secret';

module.exports = {};
