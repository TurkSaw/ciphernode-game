
import assert from 'assert';
// Mock class to test just the method
class MockDB {
    checkAchievementCondition(achievement, userStats) {
        switch (achievement.condition_type) {
            case 'total_games':
                return (userStats.total_games || 0) >= achievement.condition_value;
            case 'score':
                return (userStats.score || 0) >= achievement.condition_value;
            case 'best_time':
                return !!(userStats.best_time && userStats.best_time <= achievement.condition_value);
            case 'current_streak':
                return (userStats.current_streak || 0) >= achievement.condition_value;
            case 'total_play_time':
                return (userStats.total_play_time || 0) >= achievement.condition_value;
            case 'created':
                return true;
            default:
                return false;
        }
    }
}

const db = new MockDB();

console.log('🧪 Testing checkAchievementCondition...');

// Test Data
const achievements = {
    first_game: { condition_type: 'total_games', condition_value: 1 },
    speed_demon: { condition_type: 'best_time', condition_value: 30 },
    high_scorer: { condition_type: 'score', condition_value: 500 }
};

// Test Cases
const tests = [
    {
        name: 'Should unlock first_game when total_games IS 1',
        achievement: achievements.first_game,
        stats: { total_games: 1 },
        expected: true
    },
    {
        name: 'Should NOT unlock first_game when total_games IS 0',
        achievement: achievements.first_game,
        stats: { total_games: 0 },
        expected: false
    },
    {
        name: 'Should unlock speed_demon when best_time IS 29',
        achievement: achievements.speed_demon,
        stats: { best_time: 29 },
        expected: true
    },
    {
        name: 'Should NOT unlock speed_demon when best_time IS 31',
        achievement: achievements.speed_demon,
        stats: { best_time: 31 },
        expected: false
    },
    {
        name: 'Should NOT unlock speed_demon when best_time IS undefined',
        achievement: achievements.speed_demon,
        stats: {},
        expected: false
    },
    {
        name: 'Should unlock high_scorer when score IS 500',
        achievement: achievements.high_scorer,
        stats: { score: 500 },
        expected: true
    }
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
    const result = db.checkAchievementCondition(test.achievement, test.stats);
    try {
        assert.strictEqual(result, test.expected);
        passed++;
    } catch (e) {
        console.error(`❌ Failed: ${test.name}`);
        console.error(`   Expected: ${test.expected}, Got: ${result}`);
        failed++;
    }
});

console.log(`\nTest Results: ${passed} Passed, ${failed} Failed`);

if (failed > 0) process.exit(1);
process.exit(0);
