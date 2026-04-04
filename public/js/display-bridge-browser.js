/**
 * Customer Display Bridge - Browser Side
 * Fixed: item detection, duplicate adds, correct total field
 */
(function() {
    'use strict';

    const CONFIG = {
        serverUrl: 'https://client.ecofieldgroup.com/delight/display-bridge.php',
        pollInterval: 500,
        debug: true
    };

    let lastTotal = 0;
    let lastCartLength = 0;         // track cart size
    let lastCartSnapshot = '';      // track cart contents as JSON string
    let foundVue = false;

    function log(msg, data) {
        if (CONFIG.debug) {
            console.log('[Display Bridge]', msg, data !== undefined ? data : '');
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

    function findVueInstance() {
        // Method 1: known root elements
        for (const selector of ['#app', '.pos-app', '[data-v-app]']) {
            const el = document.querySelector(selector);
            if (el && el.__vue__) {
                if (!foundVue) log('Found Vue via ' + selector);
                return el.__vue__;
            }
        }
        // Method 2: scan all elements
        for (const el of document.querySelectorAll('*')) {
            if (el.__vue__) {
                if (!foundVue) log('Found Vue via element scan');
                return el.__vue__;
            }
        }
        return null;
    }

    function watchCart() {
        const vm = findVueInstance();

        if (!vm) {
            if (!foundVue) {
                log('Vue not found yet...');
            }
            return;
        }

        if (!foundVue) {
            foundVue = true;
            log('✅ Vue found!');
            log('  Keys:', Object.keys(vm).slice(0, 30).join(', '));
            log('  GrandTotal:', vm.GrandTotal);
            log('  details:', vm.details ? 'Array(' + vm.details.length + ')' : 'undefined');
        }

        // ── 1. Track GrandTotal changes ──────────────────────────────
        if (vm.GrandTotal !== undefined && vm.GrandTotal !== lastTotal) {
            lastTotal = vm.GrandTotal;
            log('>>> Total CHANGED to:', lastTotal);
            sendToServer({
                type: 'total',
                action: 'total',
                total: lastTotal,
                timestamp: new Date().toISOString()
            });
        }

        // ── 2. Track cart item changes ───────────────────────────────
        if (vm.details && Array.isArray(vm.details)) {

            // Build a snapshot of current cart: name + quantity for every item
            // This catches: new items, quantity changes, removals
            const snapshot = vm.details.map(d => `${d.name}:${d.quantity || 1}`).join('|');

            if (snapshot !== lastCartSnapshot) {
                const prevLength = lastCartLength;
                lastCartLength  = vm.details.length;
                lastCartSnapshot = snapshot;

                if (vm.details.length === 0) {
                    // Cart cleared
                    log('Cart cleared');
                    sendToServer({
                        type: 'clear',
                        action: 'clear',
                        timestamp: new Date().toISOString()
                    });
                    return;
                }

                // Find which item changed by comparing lengths and quantities
                // Always show the most recently touched item (last in array)
                const lastDetail = vm.details[vm.details.length - 1];
                const itemName  = lastDetail.name || '';
                const itemPrice = lastDetail.Total_price || lastDetail.Net_price || lastDetail.price || 0;
                const itemQty   = lastDetail.quantity || 1;

                log('Cart changed. Item:', itemName, 'Qty:', itemQty, 'Price:', itemPrice);

                sendToServer({
                    type: 'item',
                    action: 'item',
                    itemName: itemName,
                    name: itemName,
                    quantity: itemQty,
                    total: itemPrice,         // display will show this after 3s
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    function init() {
        log('=== Display Bridge v3 Started ===');

        setInterval(watchCart, CONFIG.pollInterval);

        // Also fire immediately on click anywhere (catches add-to-cart faster)
        document.addEventListener('click', function() {
            setTimeout(watchCart, 100);
            setTimeout(watchCart, 300);
        });

        // Test button
        const btn = document.createElement('button');
        btn.textContent = '📺 Test Display';
        btn.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;background:#4CAF50;color:white;border:none;padding:8px 12px;cursor:pointer;border-radius:4px;font-size:12px;';
        btn.onclick = function() {
            watchCart();
            const vm = findVueInstance();
            if (vm) {
                log('Vue state - GrandTotal:', vm.GrandTotal, 'details:', vm.details ? vm.details.length : 'N/A');
                log('Cart snapshot:', lastCartSnapshot);
            }
        };
        document.body.appendChild(btn);

        log('API ready: CustomerDisplay.test(), .findVue(), .showTotal(n), .showItem(name, price)');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.CustomerDisplay = {
        test:      () => sendToServer({ type: 'test', timestamp: new Date().toISOString() }),
        showItem:  (name, price) => sendToServer({ type: 'item', action: 'item', itemName: name, name, total: price, timestamp: new Date().toISOString() }),
        showTotal: (total) => sendToServer({ type: 'total', action: 'total', total, timestamp: new Date().toISOString() }),
        clear:     () => sendToServer({ type: 'clear', action: 'clear', timestamp: new Date().toISOString() }),
        findVue:   () => { const vm = findVueInstance(); log('Vue:', vm); return vm; },
        snapshot:  () => log('Snapshot:', lastCartSnapshot)
    };

})();