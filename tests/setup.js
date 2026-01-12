// Test Setup - Compatible with older Node.js versions
import assert from 'assert';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-key';

// Simple test framework for older Node.js versions
export function describe(name, fn) {
    console.log(`▶ ${name}`);
    fn();
}

export function it(name, fn) {
    try {
        const result = fn();
        if (result && typeof result.then === 'function') {
            // Async test
            result
                .then(() => {
                    console.log(`  ✔ ${name}`);
                })
                .catch((error) => {
                    console.log(`  ✖ ${name}`);
                    console.error(`    ${error.message}`);
                    process.exitCode = 1;
                });
        } else {
            // Sync test
            console.log(`  ✔ ${name}`);
        }
    } catch (error) {
        console.log(`  ✖ ${name}`);
        console.error(`    ${error.message}`);
        process.exitCode = 1;
    }
}

export function before(fn) {
    fn();
}

export function after(fn) {
    fn();
}

// Mock console to reduce noise during tests
const originalConsole = { ...console };
export const mockConsole = () => {
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
};

export const restoreConsole = () => {
    Object.assign(console, originalConsole);
};

// HTTP request helper for API testing
export async function makeRequest(app, method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const server = createServer(app);
        const port = Math.floor(Math.random() * 10000) + 30000;
        
        server.listen(port, () => {
            const options = {
                hostname: 'localhost',
                port: port,
                path: path,
                method: method.toUpperCase(),
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            const req = require('http').request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    server.close();
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body ? JSON.parse(body) : null
                    });
                });
            });

            req.on('error', (err) => {
                server.close();
                reject(err);
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    });
}

export { assert };

console.log('✅ Test setup loaded');