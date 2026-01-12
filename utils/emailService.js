import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create transporter
const createTransporter = () => {
    // Check if SMTP credentials exists
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP credentials not found. Emails will be logged to console only.');
        return null;
    }

    const port = parseInt(process.env.SMTP_PORT || '587');
    const isSecure = port === 465; // True for 465, false for other ports

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: port,
        secure: isSecure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

const transporter = createTransporter();

// Send email function
export const sendEmail = async (to, subject, html) => {
    try {
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        const appName = process.env.APP_NAME || 'CipherNode';

        // 1. Try Brevo API first (Port 443 - Bypasses Render Blocking)
        // Brevo API Key must be set in env as BREVO_API_KEY (or use SMTP_PASS if it is an API key)
        const apiKey = process.env.BREVO_API_KEY || process.env.SMTP_PASS;

        if (apiKey && !apiKey.includes(' ')) { // Simple check if it looks like a key
            try {
                const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'api-key': apiKey,
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        sender: { name: appName, email: fromEmail },
                        to: [{ email: to }],
                        subject: subject,
                        htmlContent: html
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Email sent via Brevo API:', data.messageId);
                    return { success: true, messageId: data.messageId };
                } else {
                    const errInfo = await response.json();
                    console.warn('⚠️ Brevo API failed, falling back to SMTP:', errInfo);
                }
            } catch (apiError) {
                console.warn('⚠️ Brevo API error, falling back to SMTP:', apiError.message);
            }
        }

        // 2. Fallback to Transporter (SMTP)
        if (!transporter) {
            console.log('---------------------------------------------------');
            console.log(`[MOCK EMAIL] To: ${to}`);
            console.log(`[MOCK EMAIL] Subject: ${subject}`);
            console.log(`[MOCK EMAIL] Body: \n${html}`);
            console.log('---------------------------------------------------');
            return { success: true, mock: true };
        }

        const info = await transporter.sendMail({
            from: `"${appName}" <${fromEmail}>`,
            to,
            subject,
            html,
        });

        console.log('Message sent via SMTP: %s', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};

// Templates
export const emailTemplates = {
    passwordReset: (resetLink) => `
        <div style="font-family: 'Courier New', monospace; background-color: #0f172a; color: #e2e8f0; padding: 20px; border-radius: 10px;">
            <h1 style="color: #00ff88; text-align: center;">CIPHER NODE</h1>
            <h2 style="color: #ffffff; text-align: center;">PASSWORD RESET REQUEST</h2>
            <p>Node, a request to reset your access code has been received.</p>
            <p>If this was you, click the link below to verify your identity and set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #00ff88; color: #0f172a; padding: 15px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">RESET PASSWORD</a>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">This link will expire in 1 hour.</p>
            <p style="font-size: 12px; color: #94a3b8;">If you did not request this, please ignore this transmission.</p>
            <div style="margin-top: 30px; border-top: 1px solid #334155; padding-top: 10px; text-align: center; font-size: 10px; color: #475569;">
                SECURE END-TO-END ENCRYPTED TRANSMISSION
            </div>
        </div>
    `
};
