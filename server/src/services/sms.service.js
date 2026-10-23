import { env } from '../config/env.js';

// In-memory queue for dev/test verification simulation
const devSimulationQueue = new Map();

/**
 * Real configurable SMS Provider interface.
 * Implements Fallback to a strictly-labelled development mock.
 */
class MockSmsProvider {
  constructor() {
    this.name = 'DEVELOPMENT_MOCK_SMS_PROVIDER (NOT FOR PRODUCTION)';
  }

  async sendOtp(phone, otp, purpose) {
    const timestamp = new Date().toISOString();
    // Record into dev queue for local testing
    devSimulationQueue.set(phone, {
      otp,
      purpose,
      timestamp,
      maskedPhone: phone.replace(/(\d{2})\d+(\d{2})/, '$1******$2'),
    });

    console.log('----------------------------------------------------');
    console.log(`[DEV-ONLY MOCK SMS PROVIDER - NOT FOR PRODUCTION]`);
    console.log(`Recipient: ${phone.replace(/(\d{2})\d+(\d{2})/, '$1******$2')}`);
    console.log(`Purpose: ${purpose}`);
    console.log(`Notice: Real SMS provider credentials not configured.`);
    console.log(`Simulation Queue Updated at: ${timestamp}`);
    console.log('----------------------------------------------------');

    return {
      success: true,
      provider: 'development_mock',
      isDevelopmentMock: true,
      message: 'OTP dispatched via Development Mock SMS Provider.',
      timestamp,
    };
  }
}

class Fast2SmsProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.name = 'Fast2SMS';
  }

  async sendOtp(phone, otp, purpose) {
    try {
      // Clean phone number to 10 digits for Indian standard
      const cleaned = phone.replace(/\D/g, '').slice(-10);
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: cleaned,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.return === false) {
        throw new Error(data.message || 'Fast2SMS dispatch error');
      }

      return {
        success: true,
        provider: 'fast2sms',
        isDevelopmentMock: false,
        message: 'OTP delivered via Fast2SMS gateway.',
      };
    } catch (err) {
      console.error('[Fast2SMS Error]', err.message);
      throw err;
    }
  }
}

class TwilioSmsProvider {
  constructor(accountSid, authToken, fromNumber) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
    this.name = 'Twilio';
  }

  async sendOtp(phone, otp, purpose) {
    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const params = new URLSearchParams({
        To: phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`,
        From: this.fromNumber,
        Body: `Your LocalHub X verification code is ${otp}. Valid for 10 minutes. Do not share.`,
      });

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Twilio dispatch error');
      }

      return {
        success: true,
        provider: 'twilio',
        isDevelopmentMock: false,
        message: 'OTP delivered via Twilio gateway.',
      };
    } catch (err) {
      console.error('[Twilio Error]', err.message);
      throw err;
    }
  }
}

/**
 * Factory function to instantiate configured SMS Provider.
 */
function getSmsProvider() {
  const providerType = env.auth.smsProvider.toLowerCase();

  if (providerType === 'fast2sms' && env.auth.fast2smsApiKey) {
    return new Fast2SmsProvider(env.auth.fast2smsApiKey);
  }

  if (
    providerType === 'twilio' &&
    env.auth.twilioAccountSid &&
    env.auth.twilioAuthToken &&
    env.auth.twilioFromNumber
  ) {
    return new TwilioSmsProvider(
      env.auth.twilioAccountSid,
      env.auth.twilioAuthToken,
      env.auth.twilioFromNumber
    );
  }

  return new MockSmsProvider();
}

const activeSmsProvider = getSmsProvider();

export async function sendSmsOtp({ phone, otp, purpose }) {
  return await activeSmsProvider.sendOtp(phone, otp, purpose);
}

export function getActiveSmsProviderInfo() {
  return {
    providerName: activeSmsProvider.name,
    isMock: activeSmsProvider instanceof MockSmsProvider,
  };
}

/**
 * Strictly dev/test helper to retrieve simulated OTP in local test scripts.
 * Throws in production environments.
 */
export function getDevSimulatedOtp(phone) {
  if (env.isProduction) {
    throw new Error('Dev simulated OTP retrieval is prohibited in production.');
  }
  return devSimulationQueue.get(phone)?.otp || null;
}
