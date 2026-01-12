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

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
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
        if (!transporter) {
            console.log('---------------------------------------------------');
            console.log(`[MOCK EMAIL] To: ${to}`);
            console.log(`[MOCK EMAIL] Subject: ${subject}`);
            console.log(`[MOCK EMAIL] Body: \n${html}`);
            console.log('---------------------------------------------------');
            return { success: true, mock: true };
        }

        const info = await transporter.sendMail({
            from: `"${process.env.APP_NAME || 'CipherNode'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });

        console.log('Message sent: %s', info.messageId);
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
