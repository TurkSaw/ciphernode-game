// Unit Tests - Game Logic Functions
import { describe, it, assert } from '../setup.js';

// Mock game logic functions (these should be extracted from client-side code)
const gameLogic = {
    calculateScore: (level, timeBonus, streakMultiplier = 1) => {
        const baseScore = level * 10;
        const timeBonusScore = Math.max(0, timeBonus);
        return Math.floor((baseScore + timeBonusScore) * streakMultiplier);
    },
    
    calculateEnergyRegeneration: (lastUpdate, currentTime, maxEnergy = 100, regenMinutes = 5) => {
        const timeDiff = currentTime - lastUpdate;
        const minutesPassed = Math.floor(timeDiff / (1000 * 60));
        const energyToAdd = Math.floor(minutesPassed / regenMinutes);
        return Math.min(maxEnergy, energyToAdd);
    },
    
    isValidMove: (grid, fromX, fromY, toX, toY) => {
        // Basic grid validation
        if (fromX < 0 || fromY < 0 || toX < 0 || toY < 0) return false;
        if (fromX >= grid.length || toX >= grid.length) return false;
        if (fromY >= grid[0].length || toY >= grid[0].length) return false;
        
        // Can't move to same position
        if (fromX === toX && fromY === toY) return false;
        
        // Adjacent moves only (including diagonals)
        const deltaX = Math.abs(toX - fromX);
        const deltaY = Math.abs(toY - fromY);
        return deltaX <= 1 && deltaY <= 1;
    },
    
    generateGrid: (size = 8) => {
        const grid = [];
        const symbols = ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠'];
        
        for (let i = 0; i < size; i++) {
            grid[i] = [];
            for (let j = 0; j < size; j++) {
                grid[i][j] = symbols[Math.floor(Math.random() * symbols.length)];
            }
        }
        return grid;
    },
    
    findMatches: (grid) => {
        const matches = [];
        const rows = grid.length;
        const cols = grid[0].length;
        
        // Check horizontal matches (3 or more)
        for (let i = 0; i < rows; i++) {
            let count = 1;
            let current = grid[i][0];
            
            for (let j = 1; j < cols; j++) {
                if (grid[i][j] === current) {
                    count++;
                } else {
                    if (count >= 3) {
                        matches.push({
                            type: 'horizontal',
                            row: i,
                            startCol: j - count,
                            length: count,
                            symbol: current
                        });
                    }
                    count = 1;
                    current = grid[i][j];
                }
            }
            
            // Check end of row
            if (count >= 3) {
                matches.push({
                    type: 'horizontal',
                    row: i,
                    startCol: cols - count,
                    length: count,
                    symbol: current
                });
            }
        }
        
        return matches;
    }
};

describe('Game Logic Tests', () => {
    
    describe('Score Calculation', () => {
        it('should calculate basic score correctly', () => {
            assert.strictEqual(gameLogic.calculateScore(1, 0), 10);
            assert.strictEqual(gameLogic.calculateScore(5, 0), 50);
            assert.strictEqual(gameLogic.calculateScore(10, 0), 100);
        });
        
        it('should add time bonus correctly', () => {
            assert.strictEqual(gameLogic.calculateScore(1, 20), 30); // 10 + 20
            assert.strictEqual(gameLogic.calculateScore(5, 15), 65); // 50 + 15
        });
        
        it('should apply streak multiplier correctly', () => {
            assert.strictEqual(gameLogic.calculateScore(1, 0, 2), 20); // 10 * 2
            assert.strictEqual(gameLogic.calculateScore(5, 10, 1.5), 90); // (50 + 10) * 1.5
        });
        
        it('should handle negative time bonus', () => {
            assert.strictEqual(gameLogic.calculateScore(1, -10), 10); // Negative bonus ignored
        });
        
        it('should floor the final score', () => {
            assert.strictEqual(gameLogic.calculateScore(1, 5, 1.7), 25); // Floor(15 * 1.7) = 25
        });
    });
    
    describe('Energy Regeneration', () => {
        it('should calculate energy regeneration correctly', () => {
            const now = Date.now();
            const fiveMinutesAgo = now - (5 * 60 * 1000);
            const tenMinutesAgo = now - (10 * 60 * 1000);
            
            assert.strictEqual(gameLogic.calculateEnergyRegeneration(fiveMinutesAgo, now), 1);
            assert.strictEqual(gameLogic.calculateEnergyRegeneration(tenMinutesAgo, now), 2);
        });
        
        it('should not exceed max energy', () => {
            const now = Date.now();
            const longTimeAgo = now - (1000 * 60 * 1000); // 1000 minutes ago
            
            assert.strictEqual(gameLogic.calculateEnergyRegeneration(longTimeAgo, now, 100), 100);
        });
        
        it('should handle same time (no regeneration)', () => {
            const now = Date.now();
            assert.strictEqual(gameLogic.calculateEnergyRegeneration(now, now), 0);
        });
        
        it('should handle custom regeneration rate', () => {
            const now = Date.now();
            const tenMinutesAgo = now - (10 * 60 * 1000);
            
            // 10 minutes with 10-minute regen rate = 1 energy
            assert.strictEqual(gameLogic.calculateEnergyRegeneration(tenMinutesAgo, now, 100, 10), 1);
        });
    });
    
    describe('Move Validation', () => {
        const testGrid = [
            ['🔴', '🟢', '🔵'],
            ['🟡', '🟣', '🟠'],
            ['🔴', '🟢', '🔵']
        ];
        
        it('should accept valid adjacent moves', () => {
            assert.strictEqual(gameLogic.isValidMove(testGrid, 0, 0, 0, 1), true); // Right
            assert.strictEqual(gameLogic.isValidMove(testGrid, 0, 0, 1, 0), true); // Down
            assert.strictEqual(gameLogic.isValidMove(testGrid, 1, 1, 0, 0), true); // Diagonal
            assert.strictEqual(gameLogic.isValidMove(testGrid, 1, 1, 2, 2), true); // Diagonal
        });
        
        it('should reject invalid moves', () => {
            assert.strictEqual(gameLogic.isValidMove(testGrid, 0, 0, 0, 0), false); // Same position
            assert.strictEqual(gameLogic.isValidMove(testGrid, 0, 0, 0, 2), false); // Too far
            assert.strictEqual(gameLogic.isValidMove(testGrid, 0, 0, 2, 0), false); // Too far
            assert.strictEqual(gameLogic.isValidMove(testGrid, -1, 0, 0, 0), false); // Out of bounds
            assert.strictEqual(gameLogic.isValidMove(testGrid, 0, 0, 3, 0), false); // Out of bounds
        });
    });
    
    describe('Grid Generation', () => {
        it('should generate grid with correct size', () => {
            const grid = gameLogic.generateGrid(5);
            assert.strictEqual(grid.length, 5);
            assert.strictEqual(grid[0].length, 5);
        });
        
        it('should generate grid with default size', () => {
            const grid = gameLogic.generateGrid();
            assert.strictEqual(grid.length, 8);
            assert.strictEqual(grid[0].length, 8);
        });
        
        it('should fill grid with valid symbols', () => {
            const grid = gameLogic.generateGrid(3);
            const validSymbols = ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠'];
            
            for (let i = 0; i < grid.length; i++) {
                for (let j = 0; j < grid[i].length; j++) {
                    assert.strictEqual(validSymbols.includes(grid[i][j]), true);
                }
            }
        });
    });
    
    describe('Match Finding', () => {
        it('should find horizontal matches', () => {
            const grid = [
                ['🔴', '🔴', '🔴', '🟢'],
                ['🟡', '🟣', '🟠', '🔵'],
                ['🔴', '🟢', '🔵', '🟡']
            ];
            
            const matches = gameLogic.findMatches(grid);
            assert.strictEqual(matches.length, 1);
            assert.strictEqual(matches[0].type, 'horizontal');
            assert.strictEqual(matches[0].row, 0);
            assert.strictEqual(matches[0].startCol, 0);
            assert.strictEqual(matches[0].length, 3);
            assert.strictEqual(matches[0].symbol, '🔴');
        });
        
        it('should find multiple matches', () => {
            const grid = [
                ['🔴', '🔴', '🔴', '🟢'],
                ['🟡', '🟡', '🟡', '🟡'],
                ['🔴', '🟢', '🔵', '🟡']
            ];
            
            const matches = gameLogic.findMatches(grid);
            assert.strictEqual(matches.length, 2);
        });
        
        it('should not find matches with less than 3', () => {
            const grid = [
                ['🔴', '🔴', '🟢', '🟢'],
                ['🟡', '🟣', '🟠', '🔵'],
                ['🔴', '🟢', '🔵', '🟡']
            ];
            
            const matches = gameLogic.findMatches(grid);
            assert.strictEqual(matches.length, 0);
        });
    });
});

console.log('✅ Game logic unit tests loaded');
    
    describe('Advanced Game Logic Tests', () => {
        it('should calculate achievement progress', () => {
            const calculateAchievementProgress = (current, target) => {
                if (target <= 0) return 100;
                return Math.min(100, Math.floor((current / target) * 100));
            };
            
            assert.strictEqual(calculateAchievementProgress(5, 10), 50);
            assert.strictEqual(calculateAchievementProgress(10, 10), 100);
            assert.strictEqual(calculateAchievementProgress(15, 10), 100);
            assert.strictEqual(calculateAchievementProgress(0, 10), 0);
        });
        
        it('should calculate streak bonus', () => {
            const calculateStreakBonus = (streak) => {
                if (streak < 2) return 1;
                if (streak < 5) return 1.2;
                if (streak < 10) return 1.5;
                return 2.0;
            };
            
            assert.strictEqual(calculateStreakBonus(1), 1);
            assert.strictEqual(calculateStreakBonus(3), 1.2);
            assert.strictEqual(calculateStreakBonus(7), 1.5);
            assert.strictEqual(calculateStreakBonus(15), 2.0);
        });
        
        it('should validate grid state', () => {
            const isValidGridState = (grid) => {
                if (!Array.isArray(grid) || grid.length === 0) return false;
                
                const expectedLength = grid.length;
                return grid.every(row => 
                    Array.isArray(row) && 
                    row.length === expectedLength &&
                    row.every(cell => typeof cell === 'boolean')
                );
            };
            
            const validGrid = [[true, false], [false, true]];
            const invalidGrid1 = [[true, false], [false]]; // Inconsistent length
            const invalidGrid2 = [[true, 'false'], [false, true]]; // Wrong type
            
            assert.strictEqual(isValidGridState(validGrid), true);
            assert.strictEqual(isValidGridState(invalidGrid1), false);
            assert.strictEqual(isValidGridState(invalidGrid2), false);
        });
        
        it('should calculate difficulty scaling', () => {
            const calculateDifficulty = (level) => {
                const baseComplexity = 3;
                const maxComplexity = 7;
                const scalingFactor = 0.2;
                
                const complexity = Math.min(
                    maxComplexity,
                    baseComplexity + Math.floor(level * scalingFactor)
                );
                
                return {
                    gridSize: complexity,
                    moveCount: complexity + 2,
                    timeLimit: Math.max(30, 120 - (level * 2))
                };
            };
            
            const level1 = calculateDifficulty(1);
            assert.strictEqual(level1.gridSize, 3);
            assert.strictEqual(level1.timeLimit, 118);
            
            const level50 = calculateDifficulty(50);
            assert.strictEqual(level50.gridSize, 7);
            assert.strictEqual(level50.timeLimit, 30);
        });
        
        it('should handle puzzle generation', () => {
            const generatePuzzle = (size, difficulty) => {
                // Create solved state (all true)
                const solved = Array(size).fill().map(() => Array(size).fill(true));
                
                // Apply random moves to create puzzle
                const moves = difficulty + Math.floor(Math.random() * 3);
                const puzzle = solved.map(row => [...row]);
                
                for (let i = 0; i < moves; i++) {
                    const x = Math.floor(Math.random() * size);
                    const y = Math.floor(Math.random() * size);
                    
                    // Toggle cell and neighbors
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                                if (dx === 0 || dy === 0) { // Only orthogonal neighbors
                                    puzzle[nx][ny] = !puzzle[nx][ny];
                                }
                            }
                        }
                    }
                }
                
                return puzzle;
            };
            
            const puzzle = generatePuzzle(3, 5);
            assert.strictEqual(puzzle.length, 3);
            assert.strictEqual(puzzle[0].length, 3);
            assert.strictEqual(puzzle.every(row => row.every(cell => typeof cell === 'boolean')), true);
        });
    });
    
    describe('Performance Tests', () => {
        it('should handle large grid operations efficiently', () => {
            const startTime = Date.now();
            
            // Generate large grid
            const largeGrid = gameLogic.generateGrid(20);
            
            // Perform operations
            for (let i = 0; i < 100; i++) {
                gameLogic.findMatches(largeGrid);
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete within reasonable time (1 second)
            assert.strictEqual(duration < 1000, true);
        });
        
        it('should handle rapid score calculations', () => {
            const startTime = Date.now();
            
            for (let i = 0; i < 10000; i++) {
                gameLogic.calculateScore(i % 100, i % 50, 1 + (i % 3));
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete within reasonable time (100ms)
            assert.strictEqual(duration < 100, true);
        });
    });