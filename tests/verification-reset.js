
import SupabaseDB from '../supabase-db.js';
import { sendEmail } from '../utils/emailService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testPasswordResetFlow() {
    console.log('🧪 Starting Password Reset Verification...');

    // 1. Initialize SupabaseDB
    const db = new SupabaseDB();

    // Test user email
    const testEmail = 'testuser_' + Date.now() + '@example.com';
    const testPassword = 'Password123!';

    try {
        // 2. Register a test user
        const testUsername = 'User_' + Date.now();
        console.log(`\n1. Creating test user: ${testUsername} (${testEmail})`);
        const { data: user, error: registerError } = await db.registerUser(testUsername, testEmail, testPassword);

        if (registerError) {
            throw new Error('Failed to create test user: ' + registerError);
        }
        if (!user || !user.id) {
            throw new Error('Failed to create test user: No user data');
        }
        console.log('✅ Test user created with ID:', user.id);

        // 3. Create Reset Token
        console.log('\n2. Generating password reset token...');
        const { data: resetData, error: tokenError } = await db.createPasswordResetToken(testEmail);

        if (tokenError || !resetData) {
            throw new Error('Failed to create reset token: ' + tokenError);
        }
        const token = resetData.token;
        console.log('✅ Reset token generated successfully');

        // 4. Send Reset Email (Simulated or Real)
        console.log('\n3. Sending reset email...');
        const emailSent = await sendEmail(
            testEmail,
            'Password Reset',
            `Click here to reset: http://localhost:3000/reset-password?token=${token}`
        );

        if (emailSent) {
            console.log('✅ Email sent successfully (check console/inbox)');
        } else {
            console.log('⚠️ Email sending failed or mocked');
        }

        // 5. Reset Password
        console.log('\n4. Reseting password with token...');
        const newPassword = 'NewPassword789!';
        const result = await db.resetPasswordWithToken(token, newPassword);

        if (result.data) {
            console.log('✅ Password reset successful!');
        } else {
            throw new Error(`Password reset failed: ${result.error}`);
        }

        // 6. Login with NEW password
        console.log('\n5. Verifying login with new password...');
        const { data: loggedIn, error: loginError } = await db.loginUser(testEmail, newPassword);
        if (loggedIn && loggedIn.user) {
            console.log('✅ Login with new password successful!');
        } else {
            throw new Error('Could not login with new password: ' + loginError);
        }

        console.log('\n🎉 Verification Passed: Password Reset Flow is working!');

    } catch (error) {
        console.error('\n❌ Verification Failed:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
        process.exit(1);
    }
}

testPasswordResetFlow();
