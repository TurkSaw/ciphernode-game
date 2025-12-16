const fs = require('fs');
const path = require('path');

function addLevelToExistingUsers() {
    const playersPath = path.join(__dirname, 'players.json');
    
    // Check if players.json exists
    if (!fs.existsSync(playersPath)) {
        return; // No players file, nothing to migrate
    }

    try {
        // Read existing data
        const data = fs.readFileSync(playersPath, 'utf8');
        const players = JSON.parse(data);
        
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
            console.log(`🔄 Auto-migration: Added level field to ${updatedCount} existing users`);
        }
        
    } catch (error) {
        console.error('❌ Auto-migration failed:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    addLevelToExistingUsers();
}

module.exports = addLevelToExistingUsers;