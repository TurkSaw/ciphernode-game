# 🚀 CipherNode Game - Deployment Guide

## Render ile PostgreSQL Deploy Etme

### 1. GitHub Repository Hazırlama
```bash
git add .
git commit -m "Add PostgreSQL support for Render deployment"
git push origin main
```

### 2. Render'da PostgreSQL Database Oluşturma
1. [render.com](https://render.com) dashboard'a git
2. "New +" > "PostgreSQL" seç
3. Ayarları yapılandır:
   - **Name**: ciphernode-db
   - **Database**: ciphernode
   - **User**: ciphernode_user
   - **Plan**: Free (1GB)
4. "Create Database" butonuna bas
5. **DATABASE_URL**'i kopyala (otomatik oluşur)

### 3. Render'da Web Service Oluşturma
1. "New +" > "Web Service" seç
2. GitHub repository'ni bağla
3. Ayarları yapılandır:
   - **Name**: ciphernode-game
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 4. Environment Variables Ayarlama
Render dashboard'da şu değişkenleri ekle:
```
NODE_ENV=production
DATABASE_URL=<postgresql-database-url-from-step-2>
USE_POSTGRESQL=true
JWT_SECRET=<auto-generate-strong-secret>
ALLOWED_ORIGINS=https://your-app-name.onrender.com
SOCKET_CORS_ORIGIN=https://your-app-name.onrender.com
```

### 5. Database Schema Kurulumu
Deploy sonrası Render dashboard'da:
1. Web Service > "Shell" sekmesi
2. Şu komutu çalıştır:
```bash
npm run setup-db
```

### 4. Custom Domain (Opsiyonel)
- Render'da "Settings" > "Custom Domains"
- Kendi domain'ini ekleyebilirsin

## Diğer Platform Seçenekleri

### Railway
1. [railway.app](https://railway.app) adresine git
2. GitHub'dan import et
3. Environment variables ekle
4. Deploy et

### Heroku (Ücretli)
```bash
# Heroku CLI kur
npm install -g heroku

# Login ol
heroku login

# App oluştur
heroku create ciphernode-game

# Environment variables ekle
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Deploy et
git push heroku main
```

### Firebase (Advanced)
1. Firebase Console'da proje oluştur
2. Firebase Functions kullan
3. Firestore database ekle
4. Socket.IO için Cloud Run kullan

## Production Checklist

### Güvenlik
- [ ] JWT_SECRET güçlü ve unique
- [ ] CORS origins production URL'e ayarlandı
- [ ] Rate limiting aktif
- [ ] HTTPS zorlaması aktif

### Performance
- [ ] Compression middleware eklendi
- [ ] Static file caching ayarlandı
- [ ] Database connection pooling
- [ ] Error monitoring (Sentry vs.)

### Monitoring
- [ ] Health check endpoint
- [ ] Logging sistemi
- [ ] Performance monitoring
- [ ] Uptime monitoring

## Troubleshooting

### Common Issues
1. **Port Error**: Render PORT=10000 kullanır
2. **CORS Error**: ALLOWED_ORIGINS doğru ayarlandığından emin ol
3. **Database Error**: JSON file permissions kontrol et
4. **Socket.IO Error**: SOCKET_CORS_ORIGIN ayarını kontrol et

### Logs Kontrol Etme
```bash
# Render'da
# Dashboard > Service > Logs

# Heroku'da
heroku logs --tail -a your-app-name
```

## Production URL
Deploy sonrası oyunun URL'i:
- Render: `https://ciphernode-game.onrender.com`
- Railway: `https://ciphernode-game.up.railway.app`
- Heroku: `https://ciphernode-game.herokuapp.com`

## Database Upgrade (Gelecek)
Production'da JSON file yerine gerçek database kullanmak için:
1. PostgreSQL/MongoDB ekle
2. simple-db.js'yi database adapter'a çevir
3. Migration scriptleri yaz