import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function verifySmtp() {
    console.log('Verifying SMTP configuration...');
    console.log(`Host: ${process.env.SMTP_HOST}`);
    console.log(`Port: ${process.env.SMTP_PORT}`);
    console.log(`User: ${process.env.SMTP_USER}`);
    console.log(`From: ${process.env.SMTP_FROM}`);

    // Do not log password
    if (process.env.SMTP_PASS) {
        console.log('Password: [PRESENT]');
    } else {
        console.log('Password: [MISSING]');
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ Missing required SMTP environment variables.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        await transporter.verify();
        console.log('✅ SMTP connection established successfully!');
    } catch (error) {
        console.error('❌ SMTP connection failed:', error);
    }
}

verifySmtp();
