import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Email Service — sends inventory alert emails using nodemailer + Gmail SMTP.
 */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: `"Smart Inventory" <${process.env.SMTP_USER || 'noreply@inventory.app'}>`,
      to,
      subject,
      html,
    });
    logger.info(`📧 Email sent: ${info.messageId} -> ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    logger.error(`📧 Email failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export function buildAlertEmail(subject: string, message: string): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4F46E5, #06B6D4); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">📦 Smart Inventory Alert</h1>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1f2937; margin-top: 0;">${subject}</h2>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">${message}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Smart Inventory Management System • ${new Date().toLocaleString()}
        </p>
      </div>
    </div>
  `;
}
