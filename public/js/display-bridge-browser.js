/**
 * Customer Display Bridge - Browser Side
 * Quick fix - no npm build needed!
 * Just upload this file and include in your blade template
 */
(function() {
    'use strict';

    const CONFIG = {
        serverUrl: 'https://client.ecofieldgroup.com/delight/display-bridge.php',
        pollInterval: 2000,
        debug: true
    };

    let lastTotal = 0;
    let lastItem = null;

    function log(msg) {
        if (CONFIG.debug) console.log('[Display Bridge]', msg);
    }

    async function sendToServer(data) {
        try {
            const response = await fetch(CONFIG.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            log('Sent: ' + JSON.stringify(data) + ' | Response: ' + JSON.stringify(result));
            return result;
        } catch (err) {
            log('Error: ' + err.message);
        }
    }

    // Watch for total changes in Vue app
    function watchTotal() {
        // Try to find Vue instance and GrandTotal
        const vueEl = document.querySelector('#app') || document.querySelector('.pos-app');
        if (!vueEl || !vueEl.__vue__) {
            log('Vue app not found, retrying...');
            return;
        }

        const vm = vueEl.__vue__;
        
        // Watch GrandTotal
        if (vm.GrandTotal !== undefined && vm.GrandTotal !== lastTotal) {
            lastTotal = vm.GrandTotal;
            log('Total changed: ' + lastTotal);
            sendToServer({
                type: 'total',
                total: lastTotal,
                timestamp: new Date().toISOString()
            });
        }

        // Watch cart items
        if (vm.details && vm.details.length > 0) {
            const lastDetail = vm.details[vm.details.length - 1];
            if (lastDetail && lastDetail.name !== lastItem) {
                lastItem = lastDetail.name;
                log('Item added: ' + lastItem);
                sendToServer({
                    type: 'item',
                    name: lastDetail.name,
                    price: lastDetail.Total_price || lastDetail.Net_price,
                    quantity: lastDetail.quantity,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    // Alternative: Watch DOM for changes
    function watchDOM() {
        const totalEl = document.querySelector('.grand-total, .total-display, [data-total]');
        if (totalEl) {
            const text = totalEl.textContent || totalEl.innerText;
            const num = parseFloat(text.replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num !== lastTotal) {
                lastTotal = num;
                log('DOM Total: ' + num);
                sendToServer({
                    type: 'total',
                    total: num,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    // Initialize
    function init() {
        log('Browser bridge initialized');
        
        // Try Vue watch first
        setInterval(watchTotal, CONFIG.pollInterval);
        
        // Fallback to DOM watch
        setInterval(watchDOM, CONFIG.pollInterval);

        // Also try to hook into Vue events
        if (window.Vue && window.Vue.prototype) {
            const originalEmit = window.Vue.prototype.$emit;
            window.Vue.prototype.$emit = function(event, ...args) {
                if (event === 'item-added' || event === 'cart-updated') {
                    log('Vue event: ' + event);
                    setTimeout(watchTotal, 100);
                }
                return originalEmit.apply(this, [event, ...args]);
            };
        }
    }

    // Start when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Global API for manual calls
    window.CustomerDisplay = {
        showItem: (name, price) => {
            return sendToServer({ type: 'item', name, price, timestamp: new Date().toISOString() });
        },
        showTotal: (total) => {
            return sendToServer({ type: 'total', total, timestamp: new Date().toISOString() });
        },
        clear: () => {
            return sendToServer({ type: 'clear', timestamp: new Date().toISOString() });
        }
    };

    log('Global CustomerDisplay API available');
})();
