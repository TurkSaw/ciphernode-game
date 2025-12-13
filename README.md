# 🎮 CipherNode Game

Cyberpunk temalı gerçek zamanlı çok oyunculu puzzle oyunu. Node.js, Socket.IO ve JSON tabanlı veritabanı ile geliştirilmiştir.

## 🚀 Özellikler

- **Gerçek Zamanlı Oyun**: Socket.IO ile anlık çok oyunculu deneyim
- **Cyberpunk Arayüz**: Yeşil/siyah terminal temalı tasarım
- **Grid Puzzle**: Hücreleri aktif/pasif yaparak bulmacaları çöz
- **Enerji Sistemi**: Her oyun 10 enerji tüketir
- **Skor Sistemi**: Hızlı çözüm = yüksek puan
- **Canlı Sohbet**: Oyuncular arası gerçek zamanlı mesajlaşma
- **Liderlik Tablosu**: En yüksek skorları takip et
- **Basit Auth**: Kullanıcı adı ile hızlı giriş

## 🛠️ Teknolojiler

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: Vanilla JavaScript, CSS3
- **Veritabanı**: JSON dosya tabanlı (SimpleDB)
- **Gerçek Zamanlı**: WebSocket bağlantıları

## 📦 Kurulum

1. **Repository'yi klonla**:
   ```bash
   git clone <repository-url>
   cd ciphernode
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

## 🎯 Nasıl Oynanır

1. **Kayıt/Giriş**: LOGIN veya REGISTER ile başla
2. **Enerji**: Her oyun 10 enerji harcar (başlangıçta 100)
3. **Hedef**: Grid'deki tüm hücreleri aktif hale getir
4. **Strateji**: Bir hücreye tıklamak kendisini ve komşularını değiştirir
5. **Skor**: Hızlı çözüm daha yüksek puan getirir
6. **Sosyal**: Chat ile diğer oyuncularla konuş

## 📁 Proje Yapısı

```
ciphernode/
├── server.js          # Ana sunucu dosyası
├── simple-db.js       # JSON veritabanı sistemi
├── package.json       # Proje bağımlılıkları
├── .env              # Ortam değişkenleri
├── public/
│   └── index.html    # Frontend (SPA)
└── players.json      # Oyuncu verileri (otomatik oluşur)
```

## 🔧 Geliştirme

### Veritabanı (SimpleDB)
- JSON dosya tabanlı basit veritabanı
- Oyuncu bilgileri ve skorları saklar
- Otomatik yedekleme ve hata yönetimi

### Socket Events
- `join game`: Oyuncı bağlantısı
- `chat message`: Mesaj gönderme
- `submit score`: Skor gönderme
- `update leaderboard`: Liderlik tablosu güncelleme

### API Endpoints
- `GET /`: Ana sayfa (index.html)
- `WebSocket /socket.io`: Gerçek zamanlı bağlantılar

## 🎨 Tema

Cyberpunk/hacker temalı arayüz:
- **Renk Paleti**: Yeşil (#00ff88), Siyah (#0d1117), Gri tonları
- **Font**: Courier New (monospace)
- **Stil**: Terminal/konsol görünümü
- **Animasyonlar**: Smooth geçişler ve glow efektleri

## 📝 Lisans

Bu proje MIT lisansı altında yayınlanmıştır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 🐛 Bilinen Sorunlar

- Enerji sistemi şu anda otomatik yenilenmiyor
- Oyuncu çıkışında socket temizliği geliştirilebilir

## 🚀 Gelecek Özellikler

- [ ] Enerji otomatik yenileme sistemi
- [ ] Daha fazla puzzle türü
- [ ] Kullanıcı profil sistemi
- [ ] Başarım (achievement) sistemi
- [ ] Mobil responsive tasarım iyileştirmeleri

---

**Geliştirici**: CipherNode Team  
**Versiyon**: 1.0.0  
**Son Güncelleme**: Aralık 2024