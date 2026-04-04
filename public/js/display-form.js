/**
 * Customer Display Bridge - Manual Entry
 * Type the total and click send
 */
(function() {
    'use strict';

    const CONFIG = {
        serverUrl: 'https://client.ecofieldgroup.com/delight/display-bridge.php',
        pollInterval: 500
    };
    
    let lastTotal = 0;
    let autoSendEnabled = true;

    // Create UI
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;background:#fff;border:2px solid #4CAF50;padding:10px;border-radius:4px;box-shadow:0 2px 10px rgba(0,0,0,0.2);';
    div.innerHTML = `
        <div style="font-weight:bold;margin-bottom:5px;">📺 Customer Display</div>
        <input type="number" id="display-total" placeholder="Total" style="width:100px;padding:5px;margin-right:5px;">
        <button id="send-display" style="background:#4CAF50;color:white;border:none;padding:5px 10px;cursor:pointer;">Send</button>
        <label style="margin-left:5px;font-size:12px;"><input type="checkbox" id="auto-send" checked> Auto</label>
        <div id="display-status" style="margin-top:5px;font-size:12px;color:#666;"></div>
    `;
    document.body.appendChild(div);

    async function sendToServer(total) {
        const status = document.getElementById('display-status');
        try {
            status.textContent = 'Sending...';
            const response = await fetch(CONFIG.serverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'total',
                    total: parseFloat(total),
                    timestamp: new Date().toISOString()
                })
            });
            const result = await response.json();
            status.textContent = '✅ Auto-sent: TSH ' + total;
            console.log('[Display] Auto-sent:', total);
        } catch (err) {
            status.textContent = '❌ Error: ' + err.message;
        }
    }
    
    function getTotalFromPage() {
        // Try Vue first
        const app = document.querySelector('#app');
        if (app && app.__vue__) {
            const vm = app.__vue__;
            if (vm.GrandTotal !== undefined) {
                // Return as-is, bridge expects actual amount
                return vm.GrandTotal;
            }
        }
        // Fallback to DOM - read displayed total
        const totalPayableEl = document.querySelector('.total-payable, .grand-total, .total-amount');
        if (totalPayableEl) {
            const text = totalPayableEl.textContent || '';
            const match = text.match(/TSH\s*([\d,]+\.?\d*)/i) || text.match(/([\d,]+\.?\d*)/);
            if (match) {
                return parseFloat(match[1].replace(/,/g, ''));
            }
        }
        return 0;
    }
    
    function watchAndSend() {
        const current = getTotalFromPage();
        if (current !== lastTotal && current > 0) {
            lastTotal = current;
            document.getElementById('display-total').value = current;
            if (autoSendEnabled) {
                sendToServer(current);
            }
        }
    }

    document.getElementById('send-display').onclick = function() {
        const total = document.getElementById('display-total').value;
        if (total && total > 0) sendToServer(total);  // Send as-is, no multiply
    };
    
    document.getElementById('auto-send').onchange = function() {
        autoSendEnabled = this.checked;
    };
    
    // Start watching
    setInterval(watchAndSend, CONFIG.pollInterval);
    console.log('[Display] Auto-detection active - add items to see updates');
})();
