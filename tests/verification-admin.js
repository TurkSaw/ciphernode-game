
import SupabaseDB from '../supabase-db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testAdminFlow() {
    console.log('🛡️ Starting Admin Panel Verification...');

    const db = new SupabaseDB();

    // Unique test users
    const ts = Date.now();
    const adminEmail = `admin_${ts}@test.com`;
    const userEmail = `user_${ts}@test.com`;
    const password = 'Password123!';

    try {
        // 1. Register Users
        console.log(`\n1. Creating users...`);
        const { data: adminUser } = await db.registerUser(`Admin_${ts}`, adminEmail, password);
        const { data: normalUser } = await db.registerUser(`User_${ts}`, userEmail, password);

        if (!adminUser || !normalUser) throw new Error('Failed to create users');
        console.log('✅ Users created');

        // 2. Make Admin
        console.log(`\n2. Promoting ${adminUser.username} to Admin...`);
        // Direct DB update since we don't have an API for this
        const { error: promoteError } = await db.supabase
            .from('users')
            .update({ is_admin: true })
            .eq('id', adminUser.id);

        if (promoteError) throw new Error('Failed to promote admin: ' + promoteError.message);
        console.log('✅ User promoted to Admin');

        // 3. Login as Admin and check flag
        console.log(`\n3. Verifying Admin Login...`);
        const { data: loginData } = await db.loginUser(adminEmail, password);
        if (loginData.token) {
            console.log('✅ Admin Logged in');
        } else {
            throw new Error('Admin login failed');
        }

        // 4. Test User List (Admin Method)
        console.log(`\n4. Fetching User List (Admin)...`);
        const { data: userList } = await db.getAllUsers(1, 10);
        if (userList && userList.users.length >= 2) {
            console.log(`✅ User list fetched (${userList.total} users)`);
        } else {
            throw new Error('Failed to fetch user list');
        }

        // 5. Ban Normal User
        console.log(`\n5. Banning Normal User...`);
        const { data: banSuccess } = await db.toggleBanUser(normalUser.id, true);
        if (banSuccess) {
            console.log('✅ User banned successfully');
        } else {
            throw new Error('Failed to ban user');
        }

        // 6. Verify Banned User Cannot Login
        console.log(`\n6. Verifying Ban Login Block...`);
        const { error: banLoginError } = await db.loginUser(userEmail, password);
        if (banLoginError === 'Account is banned') {
            console.log('✅ Banned user blocked correctly');
        } else {
            throw new Error('Banned user was able to login or wrong error: ' + banLoginError);
        }

        // 7. Unban User
        console.log(`\n7. Unbanning User...`);
        await db.toggleBanUser(normalUser.id, false);
        const { data: unbanLogin } = await db.loginUser(userEmail, password);
        if (unbanLogin) {
            console.log('✅ User unbanned and logged in successfully');
        } else {
            throw new Error('Failed to login after unban');
        }

        // 8. System Stats
        console.log(`\n8. Fetching System Stats...`);
        const { data: stats } = await db.getSystemStats();
        if (stats && stats.totalUsers > 0) {
            console.log('✅ System stats fetched');
        } else {
            throw new Error('Failed to fetch stats');
        }

        console.log('\n🎉 Admin Panel Backend Verification Passed!');

    } catch (error) {
        console.error('\n❌ Verification Failed:', error.message);
        process.exit(1);
    }
}

testAdminFlow();
