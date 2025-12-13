const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    console.log('🚀 Setting up PostgreSQL database...');
    
    // Database connection
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL');

        // Read and execute schema
        const schemaPath = path.join(__dirname, 'database-migration', 'postgresql-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('📋 Creating tables and indexes...');
        await client.query(schema);
        console.log('✅ Database schema created successfully');

        // Test basic operations
        console.log('🧪 Testing database operations...');
        
        // Test user creation
        const testResult = await client.query(`
            INSERT INTO users (username, email, password, display_name, energy) 
            VALUES ('test_user', 'test@example.com', 'hashed_password', 'Test User', 100) 
            ON CONFLICT (username) DO NOTHING
            RETURNING id, username
        `);
        
        if (testResult.rows.length > 0) {
            console.log('✅ Test user created:', testResult.rows[0]);
            
            // Clean up test user
            await client.query('DELETE FROM users WHERE username = $1', ['test_user']);
            console.log('🧹 Test user cleaned up');
        }

        console.log('🎉 Database setup completed successfully!');
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }
}

// Run setup if called directly
if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;