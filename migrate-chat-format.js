import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function migrateChatFormat() {
    const playersPath = path.join(__dirname, 'players.json');
    
    // Check if players.json exists
    if (!fs.existsSync(playersPath)) {
        return; // No players file, nothing to migrate
    }

    try {
        // Read existing data
        const data = fs.readFileSync(playersPath, 'utf8');
        const parsedData = JSON.parse(data);
        
        // Check if it's already in new format
        if (!Array.isArray(parsedData)) {
            return; // Already migrated
        }
        
        // Convert from old format (array) to new format (object)
        const newFormat = {
            players: parsedData,
            chatMessages: [
                {
                    id: Date.now(),
                    username: 'System',
                    message: 'Chat history starts here. Welcome to CipherNode!',
                    timestamp: new Date().toISOString(),
                    type: 'system'
                }
            ],
            lastUpdated: new Date().toISOString()
        };
        
        // Save in new format
        fs.writeFileSync(playersPath, JSON.stringify(newFormat, null, 2));
        console.log('🔄 Auto-migration: Converted database to new format with chat support');
        
    } catch (error) {
        console.error('❌ Chat format migration failed:', error.message);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateChatFormat();
}

export default migrateChatFormat;