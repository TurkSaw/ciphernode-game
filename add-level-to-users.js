import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function addLevelToExistingUsers() {
    const playersPath = path.join(__dirname, 'players.json');
    
    // Check if players.json exists
    if (!fs.existsSync(playersPath)) {
        return; // No players file, nothing to migrate
    }

    try {
        // Read existing data
        const data = fs.readFileSync(playersPath, 'utf8');
        const parsedData = JSON.parse(data);
        
        // Handle both old format (array) and new format (object)
        let players;
        if (Array.isArray(parsedData)) {
            players = parsedData;
        } else if (parsedData.players && Array.isArray(parsedData.players)) {
            players = parsedData.players;
        } else {
            console.log('🔄 Auto-migration: No players array found');
            return;
        }
        
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
            // Save updated data in correct format
            if (Array.isArray(parsedData)) {
                // Old format - convert to new format
                const newFormat = {
                    players: players,
                    chatMessages: [],
                    lastUpdated: new Date().toISOString()
                };
                fs.writeFileSync(playersPath, JSON.stringify(newFormat, null, 2));
            } else {
                // New format - just update
                fs.writeFileSync(playersPath, JSON.stringify(parsedData, null, 2));
            }
            console.log(`🔄 Auto-migration: Added level field to ${updatedCount} existing users`);
        }
        
    } catch (error) {
        console.error('❌ Auto-migration failed:', error.message);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    addLevelToExistingUsers();
}

export default addLevelToExistingUsers;