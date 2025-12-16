#!/usr/bin/env node

/**
 * CipherNode Game - Veritabanı İstatistik Sıfırlama Scripti
 * 
 * Bu script kullanıcı hesaplarını koruyarak tüm oyun istatistiklerini sıfırlar.
 * 
 * Kullanım: node reset-database-stats.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env dosyasından konfigürasyonu yükle
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ HATA: SUPABASE_URL ve SUPABASE_ANON_KEY .env dosyasında tanımlanmalı!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetDatabaseStats() {
    try {
        console.log('🔄 Veritabanı istatistikleri sıfırlanıyor...\n');

        // 1. Mevcut kullanıcı sayısını kontrol et
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username')
            .limit(1000);

        if (usersError) {
            throw new Error(`Kullanıcılar alınamadı: ${usersError.message}`);
        }

        console.log(`📊 Mevcut kullanıcı sayısı: ${users.length}`);

        // 2. Kullanıcı istatistiklerini sıfırla
        console.log('🔄 Kullanıcı istatistikleri sıfırlanıyor...');
        const { error: updateError } = await supabase
            .from('users')
            .update({
                score: 0,
                level: 1,
                energy: 100,
                last_energy_update: new Date().toISOString(),
                total_games: 0,
                total_play_time: 0,
                current_streak: 0,
                max_streak: 0,
                best_time: null,
                last_played: null,
                updated_at: new Date().toISOString()
            })
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Tüm kullanıcıları güncelle

        if (updateError) {
            throw new Error(`Kullanıcı istatistikleri güncellenemedi: ${updateError.message}`);
        }

        console.log('✅ Kullanıcı istatistikleri sıfırlandı');

        // 3. Oyun oturumlarını sil
        console.log('🔄 Oyun oturumları siliniyor...');
        const { error: sessionsError } = await supabase
            .from('game_sessions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Tümünü sil

        if (sessionsError) {
            throw new Error(`Oyun oturumları silinemedi: ${sessionsError.message}`);
        }

        console.log('✅ Oyun oturumları silindi');

        // 4. Kullanıcı başarımlarını sil
        console.log('🔄 Kullanıcı başarımları siliniyor...');
        const { error: achievementsError } = await supabase
            .from('user_achievements')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Tümünü sil

        if (achievementsError) {
            throw new Error(`Kullanıcı başarımları silinemedi: ${achievementsError.message}`);
        }

        console.log('✅ Kullanıcı başarımları silindi');

        // 5. Chat mesajlarını sil (isteğe bağlı)
        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise((resolve) => {
            rl.question('❓ Chat mesajlarını da silmek istiyor musunuz? (y/N): ', resolve);
        });

        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            console.log('🔄 Chat mesajları siliniyor...');
            const { error: chatError } = await supabase
                .from('chat_messages')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Tümünü sil

            if (chatError) {
                throw new Error(`Chat mesajları silinemedi: ${chatError.message}`);
            }

            console.log('✅ Chat mesajları silindi');
        }

        rl.close();

        console.log('\n🎉 Veritabanı istatistikleri başarıyla sıfırlandı!');
        console.log('\n📋 Sıfırlanan veriler:');
        console.log('   • Kullanıcı skorları ve seviyeleri');
        console.log('   • Oyun istatistikleri (toplam oyun, süre, streak)');
        console.log('   • Enerji değerleri (100\'e sıfırlandı)');
        console.log('   • Oyun oturumları');
        console.log('   • Kullanıcı başarımları');
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            console.log('   • Chat mesajları');
        }
        console.log('\n✅ Korunan veriler:');
        console.log('   • Kullanıcı hesapları (username, email, password)');
        console.log('   • Profil bilgileri (display_name, bio, avatar, country, theme)');
        console.log('   • Başarım tanımları (achievements tablosu)');

    } catch (error) {
        console.error('❌ HATA:', error.message);
        process.exit(1);
    }
}

// Scripti çalıştır
resetDatabaseStats();