#!/usr/bin/env node
// Test Runner - Node.js Built-in Test Runner
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs';
import { promisify } from 'util';

const readdirAsync = promisify(readdir);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

async function findTestFiles(dir) {
    const files = [];
    
    try {
        const entries = await readdirAsync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            
            if (entry.isDirectory()) {
                const subFiles = await findTestFiles(fullPath);
                files.push(...subFiles);
            } else if (entry.name.endsWith('.test.js')) {
                files.push(fullPath);
            }
        }
    } catch (error) {
        // Directory doesn't exist or can't be read
        console.warn(colorize(`Warning: Could not read directory ${dir}`, 'yellow'));
    }
    
    return files;
}

function runTestFile(testFile) {
    return new Promise((resolve) => {
        console.log(colorize(`\n📋 Running: ${testFile}`, 'cyan'));
        
        const child = spawn('node', ['--test', testFile], {
            stdio: 'pipe',
            cwd: process.cwd()
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            const success = code === 0;
            
            if (success) {
                console.log(colorize(`✅ PASSED: ${testFile}`, 'green'));
            } else {
                console.log(colorize(`❌ FAILED: ${testFile}`, 'red'));
                if (stderr) {
                    console.log(colorize('STDERR:', 'red'));
                    console.log(stderr);
                }
                if (stdout) {
                    console.log(colorize('STDOUT:', 'yellow'));
                    console.log(stdout);
                }
            }
            
            resolve({ file: testFile, success, code, stdout, stderr });
        });
        
        child.on('error', (error) => {
            console.log(colorize(`💥 ERROR: ${testFile} - ${error.message}`, 'red'));
            resolve({ file: testFile, success: false, error: error.message });
        });
    });
}

async function runAllTests() {
    console.log(colorize('🧪 CipherNode Game - Test Suite', 'bright'));
    console.log(colorize('=====================================', 'blue'));
    
    const startTime = Date.now();
    
    // Find all test files
    const testFiles = await findTestFiles(__dirname);
    
    if (testFiles.length === 0) {
        console.log(colorize('⚠️  No test files found!', 'yellow'));
        return;
    }
    
    console.log(colorize(`Found ${testFiles.length} test files:`, 'blue'));
    testFiles.forEach(file => {
        const relativePath = file.replace(__dirname, '').replace(/\\/g, '/');
        console.log(colorize(`  • ${relativePath}`, 'cyan'));
    });
    
    // Run tests
    const results = [];
    
    for (const testFile of testFiles) {
        const result = await runTestFile(testFile);
        results.push(result);
    }
    
    // Summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(colorize('\n📊 Test Results Summary', 'bright'));
    console.log(colorize('========================', 'blue'));
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(colorize(`Total Tests: ${results.length}`, 'blue'));
    console.log(colorize(`Passed: ${passed}`, 'green'));
    console.log(colorize(`Failed: ${failed}`, failed > 0 ? 'red' : 'green'));
    console.log(colorize(`Duration: ${duration}s`, 'blue'));
    
    if (failed > 0) {
        console.log(colorize('\n❌ Failed Tests:', 'red'));
        results.filter(r => !r.success).forEach(result => {
            const relativePath = result.file.replace(__dirname, '').replace(/\\/g, '/');
            console.log(colorize(`  • ${relativePath}`, 'red'));
        });
    }
    
    // Exit with appropriate code
    const exitCode = failed > 0 ? 1 : 0;
    
    if (exitCode === 0) {
        console.log(colorize('\n🎉 All tests passed!', 'green'));
    } else {
        console.log(colorize('\n💥 Some tests failed!', 'red'));
    }
    
    process.exit(exitCode);
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(colorize('CipherNode Test Runner', 'bright'));
    console.log('Usage: node run-tests.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('  --unit         Run only unit tests');
    console.log('  --integration  Run only integration tests');
    console.log('  --e2e          Run only end-to-end tests');
    console.log('');
    console.log('Examples:');
    console.log('  node run-tests.js              # Run all tests');
    console.log('  node run-tests.js --unit       # Run only unit tests');
    console.log('  node run-tests.js --integration # Run only integration tests');
    process.exit(0);
}

// Filter tests based on arguments
let testFilter = null;
if (args.includes('--unit')) {
    testFilter = 'unit';
} else if (args.includes('--integration')) {
    testFilter = 'integration';
} else if (args.includes('--e2e')) {
    testFilter = 'e2e';
}

// Modify findTestFiles to respect filter
const originalFindTestFiles = findTestFiles;
if (testFilter) {
    findTestFiles = async (dir) => {
        const files = await originalFindTestFiles(dir);
        return files.filter(file => file.includes(`/${testFilter}/`));
    };
}

// Run the tests
runAllTests().catch(error => {
    console.error(colorize(`💥 Test runner error: ${error.message}`, 'red'));
    process.exit(1);
});

console.log('✅ Test runner loaded');