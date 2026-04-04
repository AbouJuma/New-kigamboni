/**
 * Customer Display Bridge - Manual Entry
 * Type the total and click send
 */
(function() {
    'use strict';

    const CONFIG = {
        serverUrl: 'https://client.ecofieldgroup.com/delight/display-bridge.php'
    };

    // Create UI
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;background:#fff;border:2px solid #4CAF50;padding:10px;border-radius:4px;box-shadow:0 2px 10px rgba(0,0,0,0.2);';
    div.innerHTML = `
        <div style="font-weight:bold;margin-bottom:5px;">📺 Customer Display</div>
        <input type="number" id="display-total" placeholder="Enter total" style="width:120px;padding:5px;margin-right:5px;">
        <button id="send-display" style="background:#4CAF50;color:white;border:none;padding:5px 10px;cursor:pointer;">Send</button>
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
                    type: 'total',
                    total: parseFloat(total),
                    timestamp: new Date().toISOString()
                })
            });
            const result = await response.json();
            status.textContent = '✅ Sent: TSH ' + total;
            console.log('[Display] Sent:', total, 'Response:', result);
        } catch (err) {
            status.textContent = '❌ Error: ' + err.message;
            console.error('[Display] Error:', err);
        }
    }

    document.getElementById('send-display').onclick = function() {
        const total = document.getElementById('display-total').value;
        if (total && total > 0) {
            sendToServer(total);
        } else {
            document.getElementById('display-status').textContent = 'Enter amount first';
        }
    };

    // Auto-fill from visible total if possible
    try {
        const totalText = document.body.innerText.match(/Total Payable[^\d]*(\d[\d,]*\.?\d*)/i);
        if (totalText) {
            document.getElementById('display-total').value = totalText[1].replace(/,/g, '');
        }
    } catch(e) {}

    console.log('[Display] Manual entry form ready. Enter total and click Send.');
})();
