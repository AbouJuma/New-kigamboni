/**
 * Customer Display Bridge - Manual Trigger Version
 * Only sends data when button is clicked - safest approach
 */
(function() {
    'use strict';

    const CONFIG = {
        serverUrl: 'https://client.ecofieldgroup.com/delight/display-bridge.php'
    };

    function log(msg, data) {
        console.log('[Display]', msg, data || '');
    }

    async function sendToServer(data) {
        try {
            log('Sending:', data);
            const response = await fetch(CONFIG.serverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            log('Server response:', result);
            alert('Sent to display: ' + JSON.stringify(data));
            return result;
        } catch (err) {
            log('Error:', err.message);
            alert('Error: ' + err.message);
        }
    }

    // Read Vue data safely
    function getCartData() {
        const allElements = document.querySelectorAll('*');
        for (let el of allElements) {
            if (el.__vue__) {
                const vm = el.__vue__;
                try {
                    return {
                        total: vm.GrandTotal,
                        items: vm.details || []
                    };
                } catch(e) {
                    return null;
                }
            }
        }
        return null;
    }

    // Create button
    const btn = document.createElement('button');
    btn.textContent = '📺 Update Display';
    btn.style.cssText = 'position:fixed;bottom:60px;right:10px;z-index:9999;background:#4CAF50;color:white;border:none;padding:10px 15px;cursor:pointer;border-radius:4px;font-weight:bold;';
    btn.onclick = function() {
        const data = getCartData();
        if (data && data.total > 0) {
            sendToServer({
                type: 'total',
                total: data.total,
                timestamp: new Date().toISOString()
            });
        } else {
            alert('No cart data found');
        }
    };
    document.body.appendChild(btn);

    log('Manual display button added. Click "📺 Update Display" to send cart total.');
})();
