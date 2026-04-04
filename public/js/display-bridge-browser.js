/**
 * Customer Display Bridge - Browser Side
 */
(function() {
    'use strict';

    const CONFIG = {
        serverUrl: 'https://client.ecofieldgroup.com/delight/display-bridge.php',
        pollInterval: 500,
        debug: true
    };

    let lastTotal = 0;
    let lastItem = null;
    let foundVue = false;

    function log(msg, data) {
        if (CONFIG.debug) {
            console.log('[Display Bridge]', msg, data || '');
        }
    }

    async function sendToServer(data) {
        try {
            log('SENDING:', data);
            const response = await fetch(CONFIG.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            log('SERVER RESPONSE:', result);
            return result;
        } catch (err) {
            log('ERROR:', err.message);
        }
    }

    // Find Vue instance - multiple methods
    function findVueInstance() {
        // Method 1: __vue__ property
        let el = document.querySelector('#app') || document.querySelector('.pos-app') || document.querySelector('[data-v-app]');
        if (el && el.__vue__) {
            if (!foundVue) log('Found Vue via __vue__');
            return el.__vue__;
        }

        // Method 2: Scan all elements for __vue__
        const allElements = document.querySelectorAll('*');
        for (let el of allElements) {
            if (el.__vue__) {
                if (!foundVue) log('Found Vue via element scan');
                return el.__vue__;
            }
        }

        return null;
    }

    // Watch for changes
    function watchCart() {
        const vm = findVueInstance();
        
        if (!vm) {
            if (!foundVue) {
                const appEl = document.querySelector('#app');
                const posEl = document.querySelector('.pos-app');
                log('Vue not found. Elements: #app=' + !!appEl + ', .pos-app=' + !!posEl);
                // Try to find any Vue element
                const all = document.querySelectorAll('*');
                let vueCount = 0;
                for (let el of all) {
                    if (el.__vue__) vueCount++;
                }
                log('Elements with __vue__:', vueCount);
            }
            return;
        }

        if (!foundVue) {
            foundVue = true;
            log('✅ Vue found!');
            log('  Keys:', Object.keys(vm).slice(0, 20).join(', '));
            log('  GrandTotal:', vm.GrandTotal);
            log('  details:', vm.details ? 'Array(' + vm.details.length + ')' : 'undefined');
        }

        // Always log current state for debugging
        if (CONFIG.debug && vm.GrandTotal !== undefined) {
            log('Current GrandTotal:', vm.GrandTotal, 'Last:', lastTotal);
        }

        // Check for GrandTotal
        if (vm.GrandTotal !== undefined && vm.GrandTotal !== lastTotal) {
            lastTotal = vm.GrandTotal;
            log('>>> Total CHANGED to:', lastTotal);
            sendToServer({
                type: 'total',
                total: lastTotal,
                timestamp: new Date().toISOString()
            });
        }

        // Check for cart items
        if (vm.details && Array.isArray(vm.details) && vm.details.length > 0) {
            const lastDetail = vm.details[vm.details.length - 1];
            if (lastDetail && lastDetail.name && lastDetail.name !== lastItem) {
                lastItem = lastDetail.name;
                log('Item added:', lastItem);
                sendToServer({
                    type: 'item',
                    name: lastDetail.name,
                    price: lastDetail.Total_price || lastDetail.Net_price,
                    quantity: lastDetail.quantity || 1,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    // Click listener - detect add to cart
    function watchClicks() {
        document.addEventListener('click', function(e) {
            const target = e.target;
            const text = (target.textContent || '').toLowerCase();
            
            if (text.includes('add') || text.includes('cart') || 
                target.closest('.add-to-cart') || target.closest('.btn-add')) {
                log('Add to cart clicked');
                setTimeout(watchCart, 100);
                setTimeout(watchCart, 500);
            }
        });
    }

    // Initialize
    function init() {
        log('=== Display Bridge v2 Started ===');
        
        setInterval(watchCart, CONFIG.pollInterval);
        watchClicks();

        // Add test button
        const btn = document.createElement('button');
        btn.textContent = '📺 Test Display';
        btn.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;background:#4CAF50;color:white;border:none;padding:8px 12px;cursor:pointer;border-radius:4px;font-size:12px;';
        btn.onclick = function() {
            watchCart();
            sendToServer({
                type: 'test',
                message: 'Manual test',
                timestamp: new Date().toISOString()
            });
        };
        document.body.appendChild(btn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.CustomerDisplay = {
        test: () => sendToServer({ type: 'test', timestamp: new Date().toISOString() }),
        showItem: (name, price) => sendToServer({ type: 'item', name, price, timestamp: new Date().toISOString() }),
        showTotal: (total) => sendToServer({ type: 'total', total, timestamp: new Date().toISOString() }),
        findVue: () => { const vm = findVueInstance(); log('Vue:', vm); return vm; }
    };

    log('API: CustomerDisplay.test(), .findVue()');
})();
