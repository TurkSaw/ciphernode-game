const fs = require('fs');
const path = require('path');
const PostgreSQLDB = require('./postgresql-db');

async function migrateToPostgreSQL() {
    console.log('🔄 Starting migration from JSON to PostgreSQL...');
    
    // Check if players.json exists
    const jsonPath = path.join(__dirname, 'players.json');
    if (!fs.existsSync(jsonPath)) {
        console.log('📄 No players.json found, starting with empty database');
        return;
    }

    try {
        // Read JSON data
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log(`📊 Found ${jsonData.length} users in JSON file`);

        // Initialize PostgreSQL connection
        const db = new PostgreSQLDB();
        
        // Wait a bit for connection to establish
        await new Promise(resolve => setTimeout(resolve, 2000));

        let successCount = 0;
        let errorCount = 0;

        for (const player of jsonData) {
            try {
                // Register user (with temporary password)
                const result = await db.registerUser(
                    player.username, 
                    player.email || `${player.username}@temp.com`, 
                    'temp-password-123' // Users will need to reset password
                );

                if (result.error) {
                    console.log(`⚠️  User ${player.username}: ${result.error}`);
                    errorCount++;
                    continue;
                }

                // Update score if exists
                if (player.score && player.score > 0) {
                    await db.upsertPlayer(player.username, player.score);
                }

                // Update energy if exists
                if (player.energy !== undefined) {
                    const energyDiff = player.energy - 100; // Default is 100
                    if (energyDiff !== 0) {
                        await db.updatePlayerEnergy(player.username, energyDiff);
                    }
                }

                console.log(`✅ Migrated: ${player.username} (Score: ${player.score || 0})`);
                successCount++;

            } catch (error) {
                console.error(`❌ Failed to migrate ${player.username}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`✅ Successfully migrated: ${successCount} users`);
        console.log(`❌ Failed migrations: ${errorCount} users`);
        
        if (successCount > 0) {
            // Backup original JSON file
            const backupPath = `${jsonPath}.backup.${Date.now()}`;
            fs.copyFileSync(jsonPath, backupPath);
            console.log(`💾 Original JSON backed up to: ${backupPath}`);
        }

        console.log('\n🎉 Migration completed!');
        console.log('\n📝 Next steps:');
        console.log('1. Test the application with PostgreSQL');
        console.log('2. Users with migrated accounts need to reset passwords');
        console.log('3. Deploy to production with DATABASE_URL set');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateToPostgreSQL();
}

module.exports = migrateToPostgreSQL;