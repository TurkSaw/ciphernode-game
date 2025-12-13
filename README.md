# 🎮 CipherNode Game

Real-time multiplayer cyberpunk puzzle game built with Node.js, Socket.IO and JSON database.

[🇺🇸 English](#english) | [🇹🇷 Türkçe](#turkish)

---

## English

### 🚀 Features

- **Real-time Multiplayer**: Instant multiplayer experience with Socket.IO
- **Cyberpunk Interface**: Green/black terminal-themed design
- **Grid Puzzle**: Solve puzzles by activating/deactivating cells
- **Energy System**: Each game consumes 10 energy
- **Scoring System**: Fast solution = higher points
- **Live Chat**: Real-time messaging between players
- **Leaderboard**: Track top scores
- **Simple Auth**: Quick login with username

### 🛠️ Technologies

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: Vanilla JavaScript, CSS3
- **Database**: JSON file-based (SimpleDB)
- **Real-time**: WebSocket connections

### 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/TurkSaw/ciphernode-game.git
   cd ciphernode-game
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   ```
   http://localhost:3000
   ```

### 🎯 How to Play

1. **Register/Login**: Start with LOGIN or REGISTER
2. **Energy**: Each game costs 10 energy (starts with 100)
3. **Goal**: Activate all cells in the grid
4. **Strategy**: Clicking a cell toggles itself and neighbors
5. **Score**: Faster solutions give higher points
6. **Social**: Chat with other players

### 📁 Project Structure

```
ciphernode/
├── server.js          # Main server file
├── simple-db.js       # JSON database system
├── package.json       # Project dependencies
├── .env              # Environment variables
├── public/
│   └── index.html    # Frontend (SPA)
└── players.json      # Player data (auto-generated)
```

### 🔧 Development

#### Database (SimpleDB)
- JSON file-based simple database
- Stores player information and scores
- Automatic backup and error handling

#### Socket Events
- `join game`: Player connection
- `chat message`: Send message
- `submit score`: Submit score
- `update leaderboard`: Update leaderboard

#### API Endpoints
- `GET /`: Main page (index.html)
- `WebSocket /socket.io`: Real-time connections

### 🎨 Theme

Cyberpunk/hacker themed interface:
- **Color Palette**: Green (#00ff88), Black (#0d1117), Gray tones
- **Font**: Courier New (monospace)
- **Style**: Terminal/console appearance
- **Animations**: Smooth transitions and glow effects

### 📝 License

This project is released under the MIT License.

### 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 🐛 Known Issues

- Energy system doesn't auto-regenerate currently
- Socket cleanup on player disconnect could be improved

### 🚀 Future Features

- [ ] Auto energy regeneration system
- [ ] More puzzle types
- [ ] User profile system
- [ ] Achievement system
- [ ] Mobile responsive design improvements

---

## Turkish

### 🚀 Özellikler

- **Gerçek Zamanlı Oyun**: Socket.IO ile anlık çok oyunculu deneyim
- **Cyberpunk Arayüz**: Yeşil/siyah terminal temalı tasarım
- **Grid Puzzle**: Hücreleri aktif/pasif yaparak bulmacaları çöz
- **Enerji Sistemi**: Her oyun 10 enerji tüketir
- **Skor Sistemi**: Hızlı çözüm = yüksek puan
- **Canlı Sohbet**: Oyuncular arası gerçek zamanlı mesajlaşma
- **Liderlik Tablosu**: En yüksek skorları takip et
- **Basit Auth**: Kullanıcı adı ile hızlı giriş

### 🛠️ Teknolojiler

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: Vanilla JavaScript, CSS3
- **Veritabanı**: JSON dosya tabanlı (SimpleDB)
- **Gerçek Zamanlı**: WebSocket bağlantıları

### 📦 Kurulum

1. **Repository'yi klonla**:
   ```bash
   git clone https://github.com/TurkSaw/ciphernode-game.git
   cd ciphernode-game
   ```

2. **Bağımlılıkları yükle**:
   ```bash
   npm install
   ```

3. **Sunucuyu başlat**:
   ```bash
   npm start
   ```

4. **Tarayıcıda aç**:
   ```
   http://localhost:3000
   ```

### 🎯 Nasıl Oynanır

1. **Kayıt/Giriş**: LOGIN veya REGISTER ile başla
2. **Enerji**: Her oyun 10 enerji harcar (başlangıçta 100)
3. **Hedef**: Grid'deki tüm hücreleri aktif hale getir
4. **Strateji**: Bir hücreye tıklamak kendisini ve komşularını değiştirir
5. **Skor**: Hızlı çözüm daha yüksek puan getirir
6. **Sosyal**: Chat ile diğer oyuncularla konuş

### 🔧 Geliştirme

#### Veritabanı (SimpleDB)
- JSON dosya tabanlı basit veritabanı
- Oyuncu bilgileri ve skorları saklar
- Otomatik yedekleme ve hata yönetimi

#### Socket Events
- `join game`: Oyuncu bağlantısı
- `chat message`: Mesaj gönderme
- `submit score`: Skor gönderme
- `update leaderboard`: Liderlik tablosu güncelleme

### 🎨 Tema

Cyberpunk/hacker temalı arayüz:
- **Renk Paleti**: Yeşil (#00ff88), Siyah (#0d1117), Gri tonları
- **Font**: Courier New (monospace)
- **Stil**: Terminal/konsol görünümü
- **Animasyonlar**: Smooth geçişler ve glow efektleri

### 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

---

**Developer**: CipherNode Team  
**Version**: 1.0.0  
**Last Update**: December 2024