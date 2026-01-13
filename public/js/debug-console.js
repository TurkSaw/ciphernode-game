class DebugConsole {
    constructor() {
        this.logs = [];
        this.isOpen = false;
        this.init();
    }

    init() {
        this.renderUI();
        this.hook();
        this.log('system', 'Debug Console Initialized. Checking for errors...');
    }

    hook() {
        // Hook into console.error
        const originalError = console.error;
        console.error = (...args) => {
            originalError.apply(console, args);
            this.log('error', args.join(' '));
        };

        // Hook into console.warn
        const originalWarn = console.warn;
        console.warn = (...args) => {
            originalWarn.apply(console, args);
            this.log('warn', args.join(' '));
        };

        // Hook into console.log (optional, maybe too noisy, let's keep it for critical info)
        const originalLog = console.log;
        console.log = (...args) => {
            originalLog.apply(console, args);
            // Only log strings that look like important info or contain 'Error'
            const msg = args.join(' ');
            if (msg.includes('Error') || msg.includes('Failed') || msg.includes('Warning')) {
                this.log('info', msg);
            }
        };

        // Catch unhandled errors
        window.addEventListener('error', (event) => {
            this.log('crash', `${event.message} at ${event.filename}:${event.lineno}`);
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.log('crash', `Unhandled Promise Rejection: ${event.reason}`);
        });
    }

    log(type, message) {
        const timestamp = new Date().toLocaleTimeString();
        this.logs.push({ type, message, timestamp });
        this.updateUI();

        // Auto-open on crash
        if (type === 'crash' || type === 'error') {
            this.btn.classList.add('pulse-error');
        }
    }

    renderUI() {
        // Styles
        const style = document.createElement('style');
        style.textContent = `
            #debug-btn {
                position: fixed;
                bottom: 20px;
                left: 20px; /* Left side to avoid conflict with other buttons */
                width: 50px;
                height: 50px;
                background: #222;
                border: 2px solid #444;
                border-radius: 50%;
                color: #fff;
                font-size: 24px;
                cursor: pointer;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                transition: all 0.3s ease;
            }
            #debug-btn:hover { transform: scale(1.1); }
            #debug-btn.pulse-error {
                background: #EF4444;
                animation: pulse 1s infinite;
            }
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
            
            #debug-panel {
                position: fixed;
                bottom: 80px;
                left: 20px;
                width: 90vw;
                max-width: 600px;
                height: 300px;
                background: rgba(10, 10, 15, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid #444;
                border-radius: 12px;
                z-index: 99999;
                display: none;
                flex-direction: column;
                box-shadow: 0 10px 30px rgba(0,0,0,0.8);
                font-family: monospace;
            }
            #debug-header {
                padding: 10px 15px;
                background: rgba(255,255,255,0.05);
                border-bottom: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: #fff;
                font-weight: bold;
            }
            #debug-header button {
                background: none;
                border: none;
                color: #aaa;
                cursor: pointer;
                font-size: 16px;
            }
            #debug-header button:hover { color: #fff; }
            #debug-content {
                flex: 1;
                overflow-y: auto;
                padding: 10px;
                font-size: 12px;
            }
            .log-entry {
                margin-bottom: 6px;
                padding: 4px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                word-break: break-all;
            }
            .log-timestamp { color: #666; margin-right: 8px; }
            .log-type-error { color: #EF4444; }
            .log-type-crash { color: #FF0000; font-weight: bold; background: rgba(255,0,0,0.1); }
            .log-type-warn { color: #F59E0B; }
            .log-type-info { color: #3B82F6; }
            .log-type-system { color: #10B981; }
        `;
        document.head.appendChild(style);

        // Button
        this.btn = document.createElement('button');
        this.btn.id = 'debug-btn';
        this.btn.innerHTML = '🐞';
        this.btn.title = 'Hata Denetleyici (Debug Console)';
        this.btn.onclick = () => this.toggle();
        document.body.appendChild(this.btn);

        // Panel
        this.panel = document.createElement('div');
        this.panel.id = 'debug-panel';
        this.panel.innerHTML = `
            <div id="debug-header">
                <span>🐞 Debug Console</span>
                <div>
                    <button onclick="window.debugConsole.clear()" style="margin-right:10px">🗑️ Clear</button>
                    <button onclick="window.debugConsole.toggle()">✕</button>
                </div>
            </div>
            <div id="debug-content"></div>
        `;
        document.body.appendChild(this.panel);

        this.content = this.panel.querySelector('#debug-content');
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.panel.style.display = this.isOpen ? 'flex' : 'none';
        if (this.isOpen) {
            this.btn.classList.remove('pulse-error');
            this.content.scrollTop = this.content.scrollHeight;
        }
    }

    clear() {
        this.logs = [];
        this.updateUI();
    }

    updateUI() {
        if (!this.content) return;

        this.content.innerHTML = this.logs.map(log => `
            <div class="log-entry log-type-${log.type}">
                <span class="log-timestamp">[${log.timestamp}]</span>
                <span class="log-message">${this.escapeHtml(log.message)}</span>
            </div>
        `).join('');

        if (this.isOpen) {
            this.content.scrollTop = this.content.scrollHeight;
        }
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
