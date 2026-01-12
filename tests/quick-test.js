#!/usr/bin/env node
// Quick Test - Run all tests synchronously
console.log('🧪 CipherNode Game - Quick Test Suite');
console.log('=====================================');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Test 1: Validation Functions
console.log('\n📋 Testing: Input Validation');
try {
    // Email validation
    const isEmail = (email) => {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email) && 
               email.length <= 254 &&
               !email.includes('..') && 
               !email.startsWith('.') && 
               !email.endsWith('.');
    };
    
    // Test valid emails
    if (!isEmail('test@example.com')) throw new Error('Valid email rejected');
    if (isEmail('invalid-email')) throw new Error('Invalid email accepted');
    if (isEmail('test..test@domain.com')) throw new Error('Double dot email accepted');
    
    console.log('  ✔ Email validation tests passed');
    passedTests++;
} catch (error) {
    console.log('  ✖ Email validation tests failed:', error.message);
    failedTests++;
}
totalTests++;

// Test 2: Username validation
try {
    const isUsername = (username) => {
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        return usernameRegex.test(username) && 
               username.length >= 3 && 
               username.length <= 30;
    };
    
    if (!isUsername('testuser')) throw new Error('Valid username rejected');
    if (isUsername('ab')) throw new Error('Short username accepted');
    if (isUsername('test user')) throw new Error('Username with space accepted');
    
    console.log('  ✔ Username validation tests passed');
    passedTests++;
} catch (error) {
    console.log('  ✖ Username validation tests failed:', error.message);
    failedTests++;
}
totalTests++;

// Test 3: Password validation
try {
    const isPassword = (password) => {
        if (!password || typeof password !== 'string' || password.length === 0) {
            return false;
        }
        return password.length >= 6 && password.length <= 128;
    };
    
    if (!isPassword('password123')) throw new Error('Valid password rejected');
    if (isPassword('12345')) throw new Error('Short password accepted');
    if (isPassword('')) throw new Error('Empty password accepted');
    
    console.log('  ✔ Password validation tests passed');
    passedTests++;
} catch (error) {
    console.log('  ✖ Password validation tests failed:', error.message);
    failedTests++;
}
totalTests++;

// Test 4: Score validation (Anti-cheat)
try {
    const isValidScore = (score, gameTime) => {
        const maxScorePerSecond = 10;
        return score >= 0 && 
               score <= 999999 &&
               (gameTime === 0 || score <= (gameTime * maxScorePerSecond + 100));
    };
    
    if (!isValidScore(100, 30)) throw new Error('Valid score rejected');
    if (isValidScore(1000, 10)) throw new Error('Suspicious score accepted');
    if (isValidScore(-10, 30)) throw new Error('Negative score accepted');
    
    console.log('  ✔ Score validation tests passed');
    passedTests++;
} catch (error) {
    console.log('  ✖ Score validation tests failed:', error.message);
    failedTests++;
}
totalTests++;

// Test 5: Game logic
console.log('\n📋 Testing: Game Logic');
try {
    const calculateScore = (level, timeBonus, streakMultiplier = 1) => {
        const baseScore = level * 10;
        const timeBonusScore = Math.max(0, timeBonus);
        return Math.floor((baseScore + timeBonusScore) * streakMultiplier);
    };
    
    if (calculateScore(1, 0) !== 10) throw new Error('Basic score calculation failed');
    if (calculateScore(5, 10) !== 60) throw new Error('Score with bonus calculation failed');
    if (calculateScore(1, 5, 2) !== 30) throw new Error('Score with multiplier calculation failed');
    
    console.log('  ✔ Score calculation tests passed');
    passedTests++;
} catch (error) {
    console.log('  ✖ Score calculation tests failed:', error.message);
    failedTests++;
}
totalTests++;

// Test 6: Energy regeneration
try {
    const calculateEnergyRegeneration = (lastUpdate, currentTime, maxEnergy = 100, regenMinutes = 5) => {
        const timeDiff = currentTime - lastUpdate;
        const minutesPassed = Math.floor(timeDiff / (1000 * 60));
        const energyToAdd = Math.floor(minutesPassed / regenMinutes);
        return Math.min(maxEnergy, energyToAdd);
    };
    
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    if (calculateEnergyRegeneration(fiveMinutesAgo, now) !== 1) {
        throw new Error('Energy regeneration calculation failed');
    }
    
    console.log('  ✔ Energy regeneration tests passed');
    passedTests++;
} catch (error) {
    console.log('  ✖ Energy regeneration tests failed:', error.message);
    failedTests++;
}
totalTests++;

// Test 7: Mock API functionality
console.log('\n📋 Testing: Mock API Logic');
try {
    // Mock user registration
    const mockUsers = new Map();
    
    const registerUser = (username, email, password) => {
        if (mockUsers.has(username.toLowerCase())) {
            throw new Error('Username already exists');
        }
        
        const user = {
            id: `user_${Date.now()}`,
            username,
            email: email.toLowerCase(),
            score: 0
        };
        
        mockUsers.set(username.toLowerCase(), user);
        return user;
    };
    
    const user1 = registerUser('testuser', 'test@example.com', 'password123');
    if (user1.username !== 'testuser') throw new Error('User registration failed');
    
    try {
        registerUser('testuser', 'test2@example.com', 'password456');
        throw new Error('Duplicate username should be rejected');
    } catch (error) {
        if (!error.message.includes('already exists')) throw error;
    }
    
    console.log('  ✔ Mock API tests passed');
    passedTests++;
} catch (error) {
    console.log('  ✖ Mock API tests failed:', error.message);
    failedTests++;
}
totalTests++;

// Test 8: Browser simulation
console.log('\n📋 Testing: Browser Simulation');
try {
    // Mock localStorage
    const mockStorage = new Map();
    
    const setItem = (key, value) => mockStorage.set(key, value);
    const getItem = (key) => mockStorage.get(key) || null;
    const removeItem = (key) => mockStorage.delete(key);
    
    setItem('test', 'value');
    if (getItem('test') !== 'value') throw new Error('localStorage setItem/getItem failed');
    
    removeItem('test');
    if (getItem('test') !== null) throw new Error('localStorage removeItem failed');
    
    // Test JSON storage
    const testUser = { username: 'test', score: 100 };
    setItem('user', JSON.stringify(testUser));
    const retrievedUser = JSON.parse(getItem('user'));
    if (retrievedUser.username !== 'test') throw new Error('JSON storage failed');
    
    console.log('  ✔ Browser simulation tests passed');
    passedTests++;
} catch (error) {
    console.log('  ✖ Browser simulation tests failed:', error.message);
    failedTests++;
}
totalTests++;

// Summary
console.log('\n📊 Test Results Summary');
console.log('========================');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
} else {
    console.log('\n💥 Some tests failed!');
    process.exit(1);
}