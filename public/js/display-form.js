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

    // Auto-fill from Total Payable display
    try {
        // Try to find the exact element with Total Payable
        const totalEl = document.querySelector('.total-amount, .grand-total, .cart-total, [data-total]');
        if (totalEl) {
            const text = totalEl.textContent || totalEl.innerText || '';
            // Match number after TSH or any currency
            const match = text.match(/TSH\s*([\d,]+\.?\d*)/i) || text.match(/([\d,]+\.?\d+)/);
            if (match) {
                const total = match[1].replace(/,/g, '');
                document.getElementById('display-total').value = total;
                console.log('[Display] Auto-filled total:', total);
            }
        } else {
            // Fallback: scan page text
            const bodyText = document.body.innerText;
            const totalMatch = bodyText.match(/Total Payable[^\d]*TSH\s*([\d,]+\.?\d*)/i);
            if (totalMatch) {
                document.getElementById('display-total').value = totalMatch[1].replace(/,/g, '');
            }
        }
    } catch(e) {}

    console.log('[Display] Manual entry form ready. Edit the total and click Send.');
})();
