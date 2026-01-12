// Unit Tests - Input Validation Functions
import { describe, it, assert } from '../setup.js';

// Validation functions extracted from server.js for testing
const validator = {
    isEmail: (email) => {
        if (!email || typeof email !== 'string') return false;
        // More strict email validation
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email) && 
               email.length <= 254 &&
               !email.includes('..') && // No consecutive dots
               !email.startsWith('.') && // No leading dot
               !email.endsWith('.'); // No trailing dot
    },
    
    isUsername: (username) => {
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        return usernameRegex.test(username) && 
               username.length >= 3 && 
               username.length <= 30;
    },
    
    isPassword: (password) => {
        if (!password || typeof password !== 'string' || password.length === 0) {
            return false;
        }
        return password.length >= 6 && password.length <= 128;
    },
    
    sanitizeString: (str, maxLength = 1000) => {
        if (!str) return '';
        return str.toString()
                  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
                  .replace(/<[^>]*>/g, '') // Remove other HTML tags
                  .trim()
                  .substring(0, maxLength);
    },
    
    isValidScore: (score, gameTime) => {
        const maxScorePerSecond = 10;
        return score >= 0 && 
               score <= 999999 &&
               (gameTime === 0 || score <= (gameTime * maxScorePerSecond + 100));
    },
    
    isValidGameTime: (time) => {
        return time >= 0 && time <= 3600; // Max 1 hour
    }
};

describe('Input Validation Tests', () => {
    
    describe('Email Validation', () => {
        it('should accept valid emails', () => {
            assert.strictEqual(validator.isEmail('test@example.com'), true);
            assert.strictEqual(validator.isEmail('user.name@domain.co.uk'), true);
            assert.strictEqual(validator.isEmail('test+tag@gmail.com'), true);
        });
        
        it('should reject invalid emails', () => {
            assert.strictEqual(validator.isEmail('invalid-email'), false);
            assert.strictEqual(validator.isEmail('test@'), false);
            assert.strictEqual(validator.isEmail('@domain.com'), false);
            assert.strictEqual(validator.isEmail('test..test@domain.com'), false);
        });
        
        it('should reject emails that are too long', () => {
            const longEmail = 'a'.repeat(250) + '@domain.com';
            assert.strictEqual(validator.isEmail(longEmail), false);
        });
    });
    
    describe('Username Validation', () => {
        it('should accept valid usernames', () => {
            assert.strictEqual(validator.isUsername('testuser'), true);
            assert.strictEqual(validator.isUsername('test_user'), true);
            assert.strictEqual(validator.isUsername('test-user'), true);
            assert.strictEqual(validator.isUsername('user123'), true);
        });
        
        it('should reject invalid usernames', () => {
            assert.strictEqual(validator.isUsername('ab'), false); // Too short
            assert.strictEqual(validator.isUsername('a'.repeat(31)), false); // Too long
            assert.strictEqual(validator.isUsername('test user'), false); // Space
            assert.strictEqual(validator.isUsername('test@user'), false); // Special char
            assert.strictEqual(validator.isUsername(''), false); // Empty
        });
    });
    
    describe('Password Validation', () => {
        it('should accept valid passwords', () => {
            assert.strictEqual(validator.isPassword('123456'), true);
            assert.strictEqual(validator.isPassword('password123'), true);
            assert.strictEqual(validator.isPassword('P@ssw0rd!'), true);
        });
        
        it('should reject invalid passwords', () => {
            assert.strictEqual(validator.isPassword('12345'), false); // Too short
            assert.strictEqual(validator.isPassword('a'.repeat(129)), false); // Too long
            assert.strictEqual(validator.isPassword(''), false); // Empty
            assert.strictEqual(validator.isPassword(null), false); // Null
        });
    });
    
    describe('String Sanitization', () => {
        it('should remove HTML tags', () => {
            assert.strictEqual(
                validator.sanitizeString('<script>alert("xss")</script>Hello'),
                'Hello'
            );
            assert.strictEqual(
                validator.sanitizeString('<b>Bold</b> text'),
                'Bold text'
            );
        });
        
        it('should trim whitespace', () => {
            assert.strictEqual(
                validator.sanitizeString('  Hello World  '),
                'Hello World'
            );
        });
        
        it('should limit string length', () => {
            const longString = 'a'.repeat(100);
            assert.strictEqual(
                validator.sanitizeString(longString, 10).length,
                10
            );
        });
        
        it('should handle empty/null inputs', () => {
            assert.strictEqual(validator.sanitizeString(''), '');
            assert.strictEqual(validator.sanitizeString(null), '');
            assert.strictEqual(validator.sanitizeString(undefined), '');
        });
    });
    
    describe('Score Validation (Anti-Cheat)', () => {
        it('should accept reasonable scores', () => {
            assert.strictEqual(validator.isValidScore(100, 30), true); // 100 points in 30 seconds
            assert.strictEqual(validator.isValidScore(0, 0), true); // Zero score
            assert.strictEqual(validator.isValidScore(50, 10), true); // 5 points per second
        });
        
        it('should reject unrealistic scores', () => {
            assert.strictEqual(validator.isValidScore(1000, 10), false); // 100 points per second
            assert.strictEqual(validator.isValidScore(-10, 30), false); // Negative score
            assert.strictEqual(validator.isValidScore(1000000, 100), false); // Too high
        });
        
        it('should handle edge cases', () => {
            assert.strictEqual(validator.isValidScore(110, 1), true); // 1 second + 100 bonus
            assert.strictEqual(validator.isValidScore(100, 0), true); // Instant game
        });
    });
    
    describe('Game Time Validation', () => {
        it('should accept valid game times', () => {
            assert.strictEqual(validator.isValidGameTime(0), true); // Instant
            assert.strictEqual(validator.isValidGameTime(60), true); // 1 minute
            assert.strictEqual(validator.isValidGameTime(3600), true); // 1 hour max
        });
        
        it('should reject invalid game times', () => {
            assert.strictEqual(validator.isValidGameTime(-1), false); // Negative
            assert.strictEqual(validator.isValidGameTime(3601), false); // Over 1 hour
        });
    });
});

console.log('✅ Validation unit tests loaded');
    
    describe('Advanced Validation Tests', () => {
        it('should validate JWT token format', () => {
            const isJWTFormat = (token) => {
                if (!token || typeof token !== 'string') return false;
                const parts = token.split('.');
                return parts.length === 3 && parts.every(part => part.length > 0);
            };
            
            assert.strictEqual(isJWTFormat('header.payload.signature'), true);
            assert.strictEqual(isJWTFormat('invalid.token'), false);
            assert.strictEqual(isJWTFormat(''), false);
        });
        
        it('should validate energy values', () => {
            const isValidEnergy = (energy) => {
                return Number.isInteger(energy) && energy >= 0 && energy <= 100;
            };
            
            assert.strictEqual(isValidEnergy(50), true);
            assert.strictEqual(isValidEnergy(0), true);
            assert.strictEqual(isValidEnergy(100), true);
            assert.strictEqual(isValidEnergy(-1), false);
            assert.strictEqual(isValidEnergy(101), false);
            assert.strictEqual(isValidEnergy(50.5), false);
        });
        
        it('should validate level values', () => {
            const isValidLevel = (level) => {
                return Number.isInteger(level) && level >= 1 && level <= 1000;
            };
            
            assert.strictEqual(isValidLevel(1), true);
            assert.strictEqual(isValidLevel(500), true);
            assert.strictEqual(isValidLevel(1000), true);
            assert.strictEqual(isValidLevel(0), false);
            assert.strictEqual(isValidLevel(1001), false);
        });
        
        it('should validate chat message length', () => {
            const isValidChatMessage = (message) => {
                return typeof message === 'string' && 
                       message.trim().length > 0 && 
                       message.length <= 500;
            };
            
            assert.strictEqual(isValidChatMessage('Hello world'), true);
            assert.strictEqual(isValidChatMessage(''), false);
            assert.strictEqual(isValidChatMessage('   '), false);
            assert.strictEqual(isValidChatMessage('a'.repeat(501)), false);
        });
        
        it('should validate IP addresses for rate limiting', () => {
            const isValidIP = (ip) => {
                const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
                return ipv4Regex.test(ip) || ipv6Regex.test(ip);
            };
            
            assert.strictEqual(isValidIP('192.168.1.1'), true);
            assert.strictEqual(isValidIP('127.0.0.1'), true);
            assert.strictEqual(isValidIP('invalid-ip'), false);
            assert.strictEqual(isValidIP('256.256.256.256'), false);
        });
    });
    
    describe('Security Validation Tests', () => {
        it('should detect SQL injection attempts', () => {
            const containsSQLInjection = (input) => {
                const sqlPatterns = [
                    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
                    /(--|\/\*|\*\/|;)/,
                    /(\bOR\b.*=.*\bOR\b)/i,
                    /(\bAND\b.*=.*\bAND\b)/i
                ];
                return sqlPatterns.some(pattern => pattern.test(input));
            };
            
            assert.strictEqual(containsSQLInjection("'; DROP TABLE users; --"), true);
            assert.strictEqual(containsSQLInjection("1' OR '1'='1"), true);
            assert.strictEqual(containsSQLInjection("normal text"), false);
            assert.strictEqual(containsSQLInjection("user@example.com"), false);
        });
        
        it('should detect XSS attempts', () => {
            const containsXSS = (input) => {
                const xssPatterns = [
                    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                    /javascript:/i,
                    /on\w+\s*=/i,
                    /<iframe/i,
                    /<object/i,
                    /<embed/i
                ];
                return xssPatterns.some(pattern => pattern.test(input));
            };
            
            assert.strictEqual(containsXSS('<script>alert("xss")</script>'), true);
            assert.strictEqual(containsXSS('javascript:alert("xss")'), true);
            assert.strictEqual(containsXSS('<img onload="alert(1)">'), true);
            assert.strictEqual(containsXSS('normal text'), false);
        });
        
        it('should validate file upload types', () => {
            const isValidImageType = (filename) => {
                const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
                const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
                return allowedExtensions.includes(extension);
            };
            
            assert.strictEqual(isValidImageType('avatar.jpg'), true);
            assert.strictEqual(isValidImageType('image.PNG'), true);
            assert.strictEqual(isValidImageType('icon.svg'), true);
            assert.strictEqual(isValidImageType('malware.exe'), false);
            assert.strictEqual(isValidImageType('script.js'), false);
        });
    });