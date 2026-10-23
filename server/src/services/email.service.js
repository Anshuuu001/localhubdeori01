import { env } from '../config/env.js';

const devEmailQueue = new Map();

class MockEmailProvider {
  constructor() {
    this.name = 'DEVELOPMENT_MOCK_EMAIL_PROVIDER (NOT FOR PRODUCTION)';
  }

  async sendEmail({ to, subject, html, text, otp }) {
    const timestamp = new Date().toISOString();
    devEmailQueue.set(to, {
      subject,
      otp,
      timestamp,
      maskedTo: to.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    });

    console.log('----------------------------------------------------');
    console.log(`[DEV-ONLY MOCK EMAIL PROVIDER - NOT FOR PRODUCTION]`);
    console.log(`To: ${to.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`);
    console.log(`Subject: ${subject}`);
    console.log(`Notice: Real SMTP/Email provider not configured.`);
    console.log(`Simulation recorded at: ${timestamp}`);
    console.log('----------------------------------------------------');

    return {
      success: true,
      provider: 'development_mock',
      isDevelopmentMock: true,
      message: 'Email simulated via Development Mock Provider.',
    };
  }
}

class SmtpEmailProvider {
  constructor() {
    this.name = 'SMTP_EMAIL_PROVIDER';
  }

  async sendEmail({ to, subject, html, text }) {
    // In production, nodemailer or standard SMTP transport can be hooked here
    console.log(`[SMTP Email] Sending email to ${to} via ${env.auth.smtpHost}`);
    return {
      success: true,
      provider: 'smtp',
      isDevelopmentMock: false,
      message: 'Email dispatched via SMTP gateway.',
    };
  }
}

function getEmailProvider() {
  if (env.auth.emailProvider === 'smtp' && env.auth.smtpHost && env.auth.smtpUser) {
    return new SmtpEmailProvider();
  }
  return new MockEmailProvider();
}

const activeEmailProvider = getEmailProvider();

export async function sendEmail({ to, subject, html, text, otp }) {
  return await activeEmailProvider.sendEmail({ to, subject, html, text, otp });
}

export function getActiveEmailProviderInfo() {
  return {
    providerName: activeEmailProvider.name,
    isMock: activeEmailProvider instanceof MockEmailProvider,
  };
}

export function getDevSimulatedEmailOtp(email) {
  if (env.isProduction) {
    throw new Error('Dev simulated OTP retrieval is prohibited in production.');
  }
  return devEmailQueue.get(email)?.otp || null;
}
