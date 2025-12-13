const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function migrateUsers() {
    const dbPath = path.join(__dirname, 'players.json');
    
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        const players = JSON.parse(data);
        
        let migrated = 0;
        
        for (let player of players) {
            let playerMigrated = false;
            
            // Eğer kullanıcının şifresi yoksa ve email'i varsa
            if (!player.password && player.email) {
                // Varsayılan şifre: "password123"
                const defaultPassword = "password123";
                player.password = await bcrypt.hash(defaultPassword, 10);
                playerMigrated = true;
                console.log(`✅ Migrated user: ${player.username} (email: ${player.email})`);
                console.log(`   Default password: ${defaultPassword}`);
            }
            // Eğer email yoksa email ekle
            if (!player.email) {
                player.email = `${player.username}@example.com`;
                player.password = await bcrypt.hash("password123", 10);
                playerMigrated = true;
                console.log(`✅ Migrated user: ${player.username} (added email: ${player.email})`);
                console.log(`   Default password: password123`);
            }
            
            // Profil alanları ekle
            if (!player.displayName) {
                player.displayName = player.username;
                playerMigrated = true;
            }
            if (!player.bio) {
                player.bio = '';
                playerMigrated = true;
            }
            if (!player.avatar) {
                player.avatar = player.username.charAt(0).toUpperCase();
                playerMigrated = true;
            }
            if (!player.country) {
                player.country = '';
                playerMigrated = true;
            }
            if (!player.theme) {
                player.theme = 'cyberpunk';
                playerMigrated = true;
            }
            if (!player.totalGames) {
                player.totalGames = 0;
                playerMigrated = true;
            }
            if (!player.totalPlayTime) {
                player.totalPlayTime = 0;
                playerMigrated = true;
            }
            if (!player.currentStreak) {
                player.currentStreak = 0;
                playerMigrated = true;
            }
            if (!player.maxStreak) {
                player.maxStreak = 0;
                playerMigrated = true;
            }
            if (!player.achievements) {
                player.achievements = [];
                playerMigrated = true;
            }
            
            if (playerMigrated) {
                migrated++;
            }
        }
        
        if (migrated > 0) {
            fs.writeFileSync(dbPath, JSON.stringify(players, null, 2));
            console.log(`\n🎉 Migration completed! ${migrated} users migrated.`);
            console.log(`📧 All users can now login with their email and password "password123"`);
        } else {
            console.log(`✅ No migration needed. All users already have passwords.`);
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    }
}

migrateUsers();