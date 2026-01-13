import dotenv from 'dotenv';
dotenv.config();

// Send email function using Resend API
export const sendEmail = async (to, subject, html) => {
    try {
        const apiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.SMTP_FROM || 'onboarding@resend.dev'; // Default for testing

        // Validation
        if (!apiKey) {
            console.warn('⚠️ RESEND_API_KEY is missing. Emails will be logged to console only.');
            return logMockEmail(to, subject, html);
        }

        console.log(`📧 Sending email via Resend to: ${to}`);

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: process.env.APP_NAME ? `${process.env.APP_NAME} <${fromEmail}>` : fromEmail,
                to: [to],
                subject: subject,
                html: html
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Email sent via Resend:', data.id);
            return { success: true, messageId: data.id };
        } else {
            const errInfo = await response.json();
            console.error('❌ Resend API Error:', errInfo);
            // Fallback to mock if API fails
            return { success: false, error: errInfo.message || 'Resend API failed' };
        }

    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};

// Helper to log emails to console (Dev/Fallback mode)
const logMockEmail = (to, subject, html) => {
    console.log('---------------------------------------------------');
    console.log(`[MOCK EMAIL] To: ${to}`);
    console.log(`[MOCK EMAIL] Subject: ${subject}`);
    console.log(`[MOCK EMAIL] Body: \n${html}`);
    console.log('---------------------------------------------------');
    return { success: true, mock: true };
};

// Templates
export const emailTemplates = {
    passwordReset: (resetLink) => `
        <div style="font-family: 'Courier New', monospace; background-color: #0f172a; color: #e2e8f0; padding: 20px; border-radius: 10px;">
            <h1 style="color: #00ff88; text-align: center;">CIPHER NODE</h1>
            <h2 style="color: #ffffff; text-align: center;">PASSWORD RESET REQUEST</h2>
            <p>You have requested to reset your access code (password).</p>
            <p>Click the secure link below to proceed:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #00ff88; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px; font-size: 16px;">RESET PASSWORD</a>
            </div>
            <p style="font-size: 12px; color: #64748b;">If you did not request this, please ignore this transmission.</p>
        </div>
    `
};
