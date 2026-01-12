#!/usr/bin/env node
// Simple Test Runner - Compatible with older Node.js versions
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

// Hardcoded test files (since readdir is causing issues)
const testFiles = [
    join(__dirname, 'unit', 'validation.test.js'),
    join(__dirname, 'unit', 'game-logic.test.js'),
    join(__dirname, 'integration', 'api.test.js'),
    join(__dirname, 'e2e', 'user-flow.test.js')
];

function runTestFile(testFile) {
    return new Promise((resolve) => {
        console.log(colorize(`\n📋 Running: ${testFile}`, 'cyan'));
        
        // Try to run with node directly (older versions don't have --test flag)
        const child = spawn('node', [testFile], {
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
    console.log(colorize('🧪 CipherNode Game - Simple Test Suite', 'bright'));
    console.log(colorize('=========================================', 'blue'));
    
    const startTime = Date.now();
    
    console.log(colorize(`Found ${testFiles.length} test files`, 'blue'));
    
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
            console.log(colorize(`  • ${result.file}`, 'red'));
        });
    }
    
    const exitCode = failed > 0 ? 1 : 0;
    
    if (exitCode === 0) {
        console.log(colorize('\n🎉 All tests passed!', 'green'));
    } else {
        console.log(colorize('\n💥 Some tests failed!', 'red'));
    }
    
    process.exit(exitCode);
}

// Run the tests
runAllTests().catch(error => {
    console.error(colorize(`💥 Test runner error: ${error.message}`, 'red'));
    process.exit(1);
});

console.log('✅ Simple test runner loaded');