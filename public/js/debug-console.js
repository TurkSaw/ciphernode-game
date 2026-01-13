(function () {
    // Debug Console Container
    const debugContainer = document.createElement('div');
    debugContainer.id = 'ui-debug-console';
    debugContainer.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        width: 90%;
        max-width: 600px;
        max-height: 300px;
        background: rgba(0, 0, 0, 0.9);
        color: #0f0;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        z-index: 99999;
        border: 2px solid #333;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
        transition: all 0.3s ease;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 8px;
        background: #333;
        color: white;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top-left-radius: 6px;
        border-top-right-radius: 6px;
        cursor: pointer;
    `;
    header.innerHTML = '<span>🐞 Hata Ayıklayıcı (Debug Console)</span>';

    // Controls
    const controls = document.createElement('div');
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Temizle';
    clearBtn.style.cssText = 'margin-right: 5px; padding: 2px 8px; background: #555; color: white; border: none; border-radius: 4px; cursor: pointer;';

    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '_';
    minimizeBtn.style.cssText = 'padding: 2px 8px; background: #555; color: white; border: none; border-radius: 4px; cursor: pointer;';

    controls.appendChild(clearBtn);
    controls.appendChild(minimizeBtn);
    header.appendChild(controls);

    // Logs Container
    const logs = document.createElement('div');
    logs.id = 'debug-logs';
    logs.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 5px;
    `;

    debugContainer.appendChild(header);
    debugContainer.appendChild(logs);
    document.body.appendChild(debugContainer);

    // Minimize Logic
    let isMinimized = false;
    minimizeBtn.onclick = () => {
        isMinimized = !isMinimized;
        if (isMinimized) {
            logs.style.display = 'none';
            debugContainer.style.height = 'auto';
            minimizeBtn.textContent = '□';
        } else {
            logs.style.display = 'flex';
            debugContainer.style.height = 'auto';
            debugContainer.style.maxHeight = '300px';
            minimizeBtn.textContent = '_';
        }
    };

    header.ondblclick = minimizeBtn.onclick;

    // Clear Logic
    clearBtn.onclick = () => {
        logs.innerHTML = '';
        addLog('Konsol temizlendi.', 'info');
    };

    // Helper to add logs
    function addLog(message, type = 'log') {
        const line = document.createElement('div');
        const time = new Date().toLocaleTimeString();

        let color = '#ccc'; // Default log
        if (type === 'error') color = '#ff4444';
        if (type === 'warn') color = '#ffbb33';
        if (type === 'info') color = '#33b5e5';

        line.style.cssText = `
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 2px;
            color: ${color};
            word-break: break-all;
        `;
        line.innerHTML = `<span style="opacity:0.5">[${time}]</span> <strong>[${type.toUpperCase()}]</strong> ${message}`;
        logs.appendChild(line);
        logs.scrollTop = logs.scrollHeight;

        // Auto-open on error if minimized
        if (type === 'error' && isMinimized) {
            minimizeBtn.click(); // Restore
        }
    }

    // Override Console Methods
    const originalError = console.error;
    console.error = function (...args) {
        originalError.apply(console, args);
        addLog(args.map(a => String(a)).join(' '), 'error');
    };

    const originalWarn = console.warn;
    console.warn = function (...args) {
        originalWarn.apply(console, args);
        addLog(args.map(a => String(a)).join(' '), 'warn');
    };

    const originalLog = console.log;
    console.log = function (...args) {
        originalLog.apply(console, args);
        // Uncomment to show standard logs too
        // addLog(args.map(a => String(a)).join(' '), 'log');
    };

    // Capture Global Errors
    window.onerror = function (msg, url, line, col, error) {
        addLog(`${msg} \n(${url}:${line}:${col})`, 'error');
        return false;
    };

    // Capture Unhandled Promise Rejections
    window.onunhandledrejection = function (event) {
        addLog(`Unhandled Rejection: ${event.reason}`, 'error');
    };

    addLog('Debug Console Başlatıldı. Tüm hatalar burada görünecek.', 'info');

})();
