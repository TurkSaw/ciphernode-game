const fs = require('fs');
const path = require('path');

function addLevelToExistingUsers() {
    console.log('🔄 Adding level field to existing users...');
    
    const playersPath = path.join(__dirname, 'players.json');
    
    // Check if players.json exists
    if (!fs.existsSync(playersPath)) {
        console.log('📄 No players.json found, nothing to migrate');
        return;
    }

    try {
        // Read existing data
        const data = fs.readFileSync(playersPath, 'utf8');
        const players = JSON.parse(data);
        
        console.log(`📊 Found ${players.length} users`);
        
        let updatedCount = 0;
        
        // Add level field to users who don't have it
        players.forEach(player => {
            if (!player.level) {
                // Calculate level based on score (rough estimation)
                // Every 100 points = 1 level, minimum level 1
                player.level = Math.max(1, Math.floor(player.score / 100) + 1);
                updatedCount++;
            }
        });
        
        if (updatedCount > 0) {
            // Save updated data
            fs.writeFileSync(playersPath, JSON.stringify(players, null, 2));
            console.log(`✅ Updated ${updatedCount} users with level field`);
            
            // Show some examples
            players.slice(0, 5).forEach(player => {
                console.log(`  ${player.username}: Score ${player.score} → Level ${player.level}`);
            });
        } else {
            console.log('✅ All users already have level field');
        }
        
        console.log('🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    addLevelToExistingUsers();
}

module.exports = addLevelToExistingUsers;