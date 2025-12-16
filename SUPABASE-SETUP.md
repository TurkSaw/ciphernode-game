# 🚀 Supabase Setup Guide for CipherNode

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up/Login with GitHub
4. Click **"New Project"**
5. Choose organization and fill:
   - **Name**: `ciphernode-game`
   - **Database Password**: Generate strong password
   - **Region**: Choose closest to your users
6. Click **"Create new project"**

## 2. Setup Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Click **"New Query"**
3. Copy and paste content from `supabase-schema.sql`
4. Click **"Run"** to execute

## 3. Get API Keys

1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL**: `https://your-project.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 4. Configure Environment Variables

### For Render Deployment:

Add these in Render Dashboard > Environment:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
USE_SUPABASE=true
```

### For Local Development:

Add to `.env` file:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
USE_SUPABASE=true
```

## 5. Test Connection

1. Deploy to Render or run locally
2. Check logs for: `🚀 Using Supabase Database`
3. Test registration and login
4. Check Supabase dashboard > **Table Editor** for data

## 6. Enable Real-time (Optional)

1. Go to **Database** > **Replication**
2. Enable replication for:
   - `chat_messages` (for real-time chat)
   - `users` (for live leaderboard)
   - `game_sessions` (for live stats)

## 7. Migration from JSON

The system automatically detects Supabase and switches. Your JSON data won't be automatically migrated, but you can:

1. Export JSON data
2. Use Supabase dashboard to import
3. Or create a migration script

## 🎯 Benefits After Setup

### Performance:
- ✅ **10x faster** queries with PostgreSQL
- ✅ **Real-time updates** for chat and leaderboard
- ✅ **Concurrent users** without conflicts
- ✅ **Automatic indexing** for fast searches

### Features:
- ✅ **Real-time chat** without Socket.IO complexity
- ✅ **Live leaderboard** updates
- ✅ **Advanced analytics** with SQL queries
- ✅ **Automatic backups** and point-in-time recovery

### Scalability:
- ✅ **Unlimited users** (within Supabase limits)
- ✅ **Global CDN** for fast access worldwide
- ✅ **Auto-scaling** database
- ✅ **Row Level Security** for data protection

## 🆓 Free Tier Limits

- **Database**: 500MB storage
- **Bandwidth**: 2GB/month
- **API requests**: Unlimited
- **Real-time connections**: Unlimited
- **Auth users**: 50,000 MAU

Perfect for CipherNode's needs!

## 🔧 Troubleshooting

### Connection Issues:
1. Check SUPABASE_URL and SUPABASE_ANON_KEY
2. Verify project is not paused
3. Check network connectivity

### Schema Issues:
1. Re-run `supabase-schema.sql`
2. Check for SQL errors in Supabase logs
3. Verify RLS policies are correct

### Performance Issues:
1. Check database usage in Supabase dashboard
2. Add indexes for slow queries
3. Optimize queries in `supabase-db.js`

## 📊 Monitoring

Supabase provides built-in monitoring:
- **Database** > **Reports** for performance
- **Auth** > **Users** for user analytics
- **API** > **Logs** for request monitoring

## 🚀 Next Steps

After Supabase setup:
1. Enable real-time subscriptions
2. Add more advanced analytics
3. Implement push notifications
4. Add social features (friends, etc.)
5. Create admin dashboard

Supabase makes all of these much easier! 🎉