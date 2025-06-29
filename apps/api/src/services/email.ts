import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface PasswordResetEmailData {
  name: string;
  resetLink: string;
  expiresIn: string;
}

interface WelcomeEmailData {
  name: string;
  dashboardLink: string;
}

// Create email transporter
const createTransporter = () => {
  if (config.emailProvider === 'sendgrid') {
    return nodemailer.createTransporter({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: config.sendgridApiKey,
      },
    });
  }
  
  // SMTP fallback
  return nodemailer.createTransporter({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPassword,
    },
  });
};

const transporter = createTransporter();

// Verify email configuration
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    logger.info('Email service connected successfully');
    return true;
  } catch (error) {
    logger.error('Email service connection failed:', error);
    return false;
  }
};

// Generic email sender
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const info = await transporter.sendMail({
      from: {
        name: 'AI Accessibility Scanner',
        address: 'noreply@accessibility-scanner.com',
      },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info('Email sent successfully', {
      to: options.to,
      subject: options.subject,
      messageId: info.messageId,
    });

    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
};

// Password reset email template
const generatePasswordResetHTML = (data: PasswordResetEmailData): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - AI Accessibility Scanner</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #2563eb; }
            .security-notice { background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
            .expires { color: #ef4444; font-weight: 600; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 Password Reset Request</h1>
                <p>AI Accessibility Scanner</p>
            </div>
            
            <div class="content">
                <h2>Hello ${data.name},</h2>
                
                <p>We received a request to reset your password for your AI Accessibility Scanner account. If you didn't make this request, you can safely ignore this email.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${data.resetLink}" class="button">Reset Your Password</a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace;">
                    ${data.resetLink}
                </p>
                
                <div class="security-notice">
                    <h3>🛡️ Security Notice</h3>
                    <ul>
                        <li>This link will expire in <span class="expires">${data.expiresIn}</span></li>
                        <li>The link can only be used once</li>
                        <li>We never store your passwords in plain text</li>
                        <li>Your account data remains secure with enterprise-grade encryption</li>
                    </ul>
                </div>
                
                <p>If you continue to have trouble, contact our support team at <a href="mailto:support@accessibility-scanner.com">support@accessibility-scanner.com</a></p>
                
                <p>Best regards,<br>
                The AI Accessibility Scanner Team</p>
            </div>
            
            <div class="footer">
                <p>This email was sent to ${data.name} because a password reset was requested for your account.</p>
                <p>AI Accessibility Scanner • Enterprise-Grade Security • SOC 2 Certified</p>
                <p><a href="https://accessibility-scanner.com/privacy">Privacy Policy</a> • <a href="https://accessibility-scanner.com/security">Security</a></p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Welcome email template
const generateWelcomeHTML = (data: WelcomeEmailData): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to AI Accessibility Scanner</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .feature { display: flex; align-items: center; margin: 15px 0; }
            .feature-icon { margin-right: 15px; font-size: 20px; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to AI Accessibility Scanner!</h1>
                <p>We Don't Just Find Issues. We Fix Them.</p>
            </div>
            
            <div class="content">
                <h2>Hello ${data.name},</h2>
                
                <p>Welcome to AI Accessibility Scanner! We're excited to help you automate accessibility compliance with AI-generated code fixes.</p>
                
                <h3>🚀 What's Next?</h3>
                
                <div class="feature">
                    <span class="feature-icon">🔗</span>
                    <div>
                        <strong>Connect Your Repository</strong><br>
                        Link your GitHub repository to start scanning
                    </div>
                </div>
                
                <div class="feature">
                    <span class="feature-icon">🔍</span>
                    <div>
                        <strong>Run Your First Scan</strong><br>
                        Scan your website for WCAG compliance issues
                    </div>
                </div>
                
                <div class="feature">
                    <span class="feature-icon">🛠️</span>
                    <div>
                        <strong>Review AI-Generated Fixes</strong><br>
                        See code fixes before they're submitted as PRs
                    </div>
                </div>
                
                <div class="feature">
                    <span class="feature-icon">✅</span>
                    <div>
                        <strong>Merge & Deploy</strong><br>
                        Review and merge fixes through your normal workflow
                    </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${data.dashboardLink}" class="button">Go to Dashboard</a>
                </div>
                
                <h3>🔒 Your Security is Our Priority</h3>
                <ul>
                    <li>SOC 2 Type II certified security controls</li>
                    <li>Ephemeral containers - no source code storage</li>
                    <li>Enterprise-grade encryption and monitoring</li>
                    <li>GDPR and CCPA compliant data handling</li>
                </ul>
                
                <p>Need help getting started? Check out our <a href="https://accessibility-scanner.com/docs">documentation</a> or <a href="mailto:support@accessibility-scanner.com">contact support</a>.</p>
                
                <p>Best regards,<br>
                The AI Accessibility Scanner Team</p>
            </div>
            
            <div class="footer">
                <p>You're receiving this email because you signed up for AI Accessibility Scanner.</p>
                <p>AI Accessibility Scanner • Enterprise-Grade Security • SOC 2 Certified</p>
                <p><a href="https://accessibility-scanner.com/unsubscribe">Unsubscribe</a> • <a href="https://accessibility-scanner.com/privacy">Privacy Policy</a></p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> => {
  const resetLink = `${config.clientUrl}/auth/reset-password?token=${resetToken}`;
  const expiresIn = '15 minutes';

  const html = generatePasswordResetHTML({
    name,
    resetLink,
    expiresIn,
  });

  const text = `
    Hello ${name},
    
    We received a request to reset your password for your AI Accessibility Scanner account.
    
    Reset your password: ${resetLink}
    
    This link will expire in ${expiresIn}.
    
    If you didn't request this, you can safely ignore this email.
    
    Best regards,
    The AI Accessibility Scanner Team
  `;

  return await sendEmail({
    to: email,
    subject: 'Reset your AI Accessibility Scanner password',
    html,
    text,
  });
};

// Send welcome email
export const sendWelcomeEmail = async (
  email: string,
  name: string
): Promise<boolean> => {
  const dashboardLink = `${config.clientUrl}/dashboard`;

  const html = generateWelcomeHTML({
    name,
    dashboardLink,
  });

  const text = `
    Welcome to AI Accessibility Scanner, ${name}!
    
    We're excited to help you automate accessibility compliance with AI-generated code fixes.
    
    Get started: ${dashboardLink}
    
    What's next:
    1. Connect your GitHub repository
    2. Run your first accessibility scan
    3. Review AI-generated fixes
    4. Merge and deploy improvements
    
    Your security is our priority with SOC 2 certification and ephemeral processing.
    
    Need help? Contact us at support@accessibility-scanner.com
    
    Best regards,
    The AI Accessibility Scanner Team
  `;

  return await sendEmail({
    to: email,
    subject: 'Welcome to AI Accessibility Scanner! 🎉',
    html,
    text,
  });
};

// Send scan completion notification
export const sendScanCompleteEmail = async (
  email: string,
  name: string,
  scanResults: {
    url: string;
    issuesFound: number;
    criticalIssues: number;
    prCreated: boolean;
    prLink?: string;
  }
): Promise<boolean> => {
  const dashboardLink = `${config.clientUrl}/dashboard`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Scan Complete - AI Accessibility Scanner</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .results { background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Scan Complete!</h1>
                <p>AI Accessibility Scanner</p>
            </div>
            
            <div class="content">
                <h2>Hello ${name},</h2>
                
                <p>Your accessibility scan for <strong>${scanResults.url}</strong> is complete!</p>
                
                <div class="results">
                    <h3>📊 Scan Results</h3>
                    <ul>
                        <li><strong>Total Issues Found:</strong> ${scanResults.issuesFound}</li>
                        <li><strong>Critical Issues:</strong> ${scanResults.criticalIssues}</li>
                        <li><strong>PR Status:</strong> ${scanResults.prCreated ? '✅ Created' : '⏳ Preparing'}</li>
                    </ul>
                </div>
                
                ${scanResults.prCreated && scanResults.prLink ? `
                    <p>🎉 <strong>Great news!</strong> We've created a pull request with fixes for the issues we found.</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="${scanResults.prLink}" class="button">View Pull Request</a>
                    </div>
                ` : ''}
                
                <div style="text-align: center; margin: 20px 0;">
                    <a href="${dashboardLink}" class="button">View Dashboard</a>
                </div>
                
                <p>Best regards,<br>
                The AI Accessibility Scanner Team</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: `Scan complete: ${scanResults.issuesFound} issues found`,
    html,
  });
};