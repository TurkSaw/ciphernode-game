const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');
const bodyParser = require('body-parser');

// Load environment variables from .env file
require('dotenv').config(); 
const SimpleDB = require('./simple-db');

// Middleware setup
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION ---
const db = new SimpleDB();
console.log("✅ Connected to Simple JSON Database");

// --- REAL-TIME GAME SOCKET ---

io.on('connection', (socket) => {
    let currentUser = null;
    let isAuthenticated = false; // Security Flag

    // 1. User Joins Game
    socket.on('join game', async (payload) => {
        const { username } = payload;
        
        // Basit kimlik doğrulama (demo için)
        currentUser = username;
        isAuthenticated = true;
        console.log(`✅ User joined: ${username}`);
        finalizeJoin(socket, username);
    });

    // Helper to finish the join process after auth success
    async function finalizeJoin(socket, username) {
        socket.broadcast.emit('chat message', { 
            user: 'System', 
            text: `${username} connected to node.` 
        });
        
        // Kullanıcıyı veritabanına ekle veya skoru getir
        const { data: existingPlayer } = await db.findPlayer(username);
        
        if (existingPlayer) {
            // Mevcut kullanıcının skorunu gönder
            socket.emit('sync score', existingPlayer.score);
        } else {
            // Yeni kullanıcı oluştur
            await db.upsertPlayer(username, 0, '');
        }
        
        updateLeaderboard();
    }

    // 2. Chat System (Protected)
    socket.on('chat message', (msg) => {
        if(!currentUser || !isAuthenticated) return; // Block unverified chat
        io.emit('chat message', { user: currentUser, text: msg });
    });

    // 3. Score Submission (Protected)
    socket.on('submit score', async (score) => {
        if(!currentUser || !isAuthenticated) return; // Block hackers
        
        try {
            await db.upsertPlayer(currentUser, score, '');
            updateLeaderboard();
        } catch (err) {
            console.error("Error saving score:", err.message);
        }
    });

    // 4. Disconnect
    socket.on('disconnect', () => { 
        if(currentUser) console.log(`${currentUser} disconnected`); 
    });

    async function updateLeaderboard() {
        const { data, error } = await db.getLeaderboard(10);
        if (data && !error) io.emit('update leaderboard', data);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`CipherNode Server running on http://localhost:${PORT}`);
});