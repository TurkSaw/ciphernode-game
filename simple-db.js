const fs = require('fs');
const path = require('path');

class SimpleDB {
    constructor() {
        this.dbPath = path.join(__dirname, 'players.json');
        this.loadData();
    }

    loadData() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                this.players = JSON.parse(data);
            } else {
                this.players = [];
            }
        } catch (error) {
            console.log('DB Load Error:', error.message);
            this.players = [];
        }
    }

    saveData() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.players, null, 2));
        } catch (error) {
            console.log('DB Save Error:', error.message);
        }
    }

    // Kullanıcı ekleme/güncelleme
    async upsertPlayer(username, score = 0, email = '') {
        const existingIndex = this.players.findIndex(p => p.username === username);
        
        if (existingIndex >= 0) {
            // Sadece skor daha yüksekse güncelle
            if (score > this.players[existingIndex].score) {
                this.players[existingIndex].score = score;
                this.saveData();
            }
            return { data: this.players[existingIndex], error: null };
        } else {
            // Yeni kullanıcı ekle
            const newPlayer = {
                id: Date.now(),
                username,
                score,
                email,
                created_at: new Date().toISOString()
            };
            this.players.push(newPlayer);
            this.saveData();
            return { data: newPlayer, error: null };
        }
    }

    // Kullanıcı bulma
    async findPlayer(username) {
        const player = this.players.find(p => p.username === username);
        return { data: player || null, error: null };
    }

    // Liderlik tablosu
    async getLeaderboard(limit = 10) {
        const sorted = this.players
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(p => ({ username: p.username, score: p.score }));
        return { data: sorted, error: null };
    }

    // Kullanıcı adı kontrolü
    async checkUsername(username) {
        const exists = this.players.some(p => p.username === username);
        return { data: exists ? [{ username }] : [], error: null };
    }
}

module.exports = SimpleDB;