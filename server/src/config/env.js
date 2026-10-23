import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  port: parseInt(process.env.PORT, 10) || 5050,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5180',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'localhubx',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    // Flag to check if explicit password or user has been supplied
    isConfigured: Boolean(process.env.DB_USER && process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== ''),
  },

  taluka: {
    name: process.env.DEFAULT_TALUKA_NAME || 'Deori Taluka',
    district: process.env.DEFAULT_DISTRICT_NAME || 'Gondia',
    state: process.env.DEFAULT_STATE_NAME || 'Maharashtra',
  },

  auth: {
    sessionSecret: process.env.SESSION_SECRET || 'localhubx-default-session-secret-change-in-prod-64bytes',
    otpSecret: process.env.OTP_SECRET || 'localhubx-default-otp-hmac-secret-change-in-prod',
    sessionDurationDays: parseInt(process.env.SESSION_DURATION_DAYS, 10) || 14,
    otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10,
    smsProvider: process.env.SMS_PROVIDER || 'mock', // 'mock' | 'fast2sms' | 'twilio'
    fast2smsApiKey: process.env.FAST2SMS_API_KEY || '',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioFromNumber: process.env.TWILIO_FROM_NUMBER || '',
    emailProvider: process.env.EMAIL_PROVIDER || 'mock', // 'mock' | 'smtp'
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
  },
};

