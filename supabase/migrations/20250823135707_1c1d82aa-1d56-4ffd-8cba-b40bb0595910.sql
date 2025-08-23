-- Security fixes: Configure auth settings properly

-- Fix OTP expiry (set to 1 hour instead of default 24 hours)
UPDATE auth.config SET value = '3600' WHERE parameter = 'OTP_EXPIRY';

-- Enable leaked password protection
UPDATE auth.config SET value = 'true' WHERE parameter = 'PASSWORD_PROTECTION_ENABLED';