import express from 'express';
import validator from '../utils/validator.js';

export default function userRoutes(authenticateToken) {
    const router = express.Router();

    // Protected route example
    router.get('/profile', authenticateToken, async (req, res) => {
        const db = req.db;
        const { data: user } = await db.findPlayer(req.user.username);
        if (user) {
            const { password, ...userProfile } = user;
            res.json({ user: userProfile });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });

    // Profil güncelleme
    router.put('/profile', authenticateToken, async (req, res) => {
        try {
            const db = req.db;
            const { displayName, bio, avatar, country, theme } = req.body;

            // Sanitize and validate inputs
            const cleanDisplayName = displayName ? validator.sanitizeString(displayName, 50) : undefined;
            const cleanBio = bio ? validator.sanitizeString(bio, 200) : undefined;
            const cleanAvatar = avatar ? validator.sanitizeString(avatar, 10) : undefined;
            const cleanCountry = country ? validator.sanitizeString(country, 5) : undefined;
            const cleanTheme = theme ? validator.sanitizeString(theme, 20) : undefined;

            // Validate display name
            if (cleanDisplayName !== undefined) {
                if (cleanDisplayName.length === 0 || cleanDisplayName.length > 50) {
                    return res.status(400).json({ error: 'Display name must be 1-50 characters' });
                }
            }

            // Validate bio
            if (cleanBio !== undefined && cleanBio.length > 200) {
                return res.status(400).json({ error: 'Bio must be less than 200 characters' });
            }

            // Validate theme
            const allowedThemes = ['cyberpunk', 'dark', 'blue', 'purple'];
            if (cleanTheme !== undefined && !allowedThemes.includes(cleanTheme)) {
                return res.status(400).json({ error: 'Invalid theme selected' });
            }

            // Validate country code
            if (cleanCountry !== undefined && cleanCountry.length > 0) {
                const allowedCountries = ['TR', 'US', 'GB', 'DE', 'FR', 'JP', 'KR', 'CN'];
                if (!allowedCountries.includes(cleanCountry)) {
                    return res.status(400).json({ error: 'Invalid country selected' });
                }
            }

            const result = await db.updateProfile(req.user.username, {
                displayName: cleanDisplayName,
                bio: cleanBio,
                avatar: cleanAvatar,
                country: cleanCountry,
                theme: cleanTheme
            });

            if (result.error) {
                return res.status(400).json({ error: result.error });
            }

            res.json({
                message: 'Profile updated successfully',
                user: result.data
            });
        } catch (error) {
            console.error('Profile update error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Oyuncu istatistikleri
    router.get('/profile/stats', authenticateToken, async (req, res) => {
        const db = req.db;
        const result = await db.getPlayerStats(req.user.username);

        if (result.error) {
            return res.status(404).json({ error: result.error });
        }

        res.json({ stats: result.data });
    });

    // Oyuncu başarımları
    router.get('/achievements', authenticateToken, async (req, res) => {
        const db = req.db;
        const result = await db.getPlayerAchievements(req.user.username);

        if (result.error) {
            return res.status(404).json({ error: result.error });
        }

        res.json({ achievements: result.data });
    });

    return router;
}
