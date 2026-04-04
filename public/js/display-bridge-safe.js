/**
 * Customer Display Bridge - Safe Browser Version
 * Non-intrusive: only watches, doesn't modify Vue
 */
(function() {
    'use strict';

    const CONFIG = {
        serverUrl: 'https://client.ecofieldgroup.com/delight/display-bridge.php',
        pollInterval: 1000
    };

    let lastTotal = null;
    let lastItemCount = 0;

    function log(msg, data) {
        console.log('[Display]', msg, data || '');
    }

    async function sendToServer(data) {
        try {
            const response = await fetch(CONFIG.serverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (err) {
            log('Send error:', err.message);
        }
    }

    // Safe Vue detection - just read, don't modify
    function getVueData() {
        // Find Vue root element
        const allElements = document.querySelectorAll('*');
        for (let el of allElements) {
            if (el.__vue__) {
                const vm = el.__vue__;
                
                // Safely read GrandTotal
                let total = null;
                try {
                    if (typeof vm.GrandTotal !== 'undefined') {
                        total = parseFloat(vm.GrandTotal);
                    }
                } catch(e) {}

                // Safely read cart items
                let items = [];
                try {
                    if (vm.details && Array.isArray(vm.details)) {
                        items = vm.details;
                    }
                } catch(e) {}

                return { total, items };
            }
        }
        return null;
    }

    // Watch for changes - improved version
    function watchChanges() {
        const data = getVueData();
        if (!data) {
            // Try to find Vue again if not found
            return;
        }

        // Always log current state for debugging
        if (Math.random() < 0.05) { // Log occasionally (5% of checks)
            log('Cart state - Items:', data.items.length, 'Total:', data.total);
        }

        // Check total changed (always send total when it changes)
        if (data.total !== null && data.total !== lastTotal && data.total > 0) {
            lastTotal = data.total;
            log('💰 TOTAL CHANGED:', lastTotal);
            sendToServer({
                type: 'total',
                total: lastTotal,
                timestamp: new Date().toISOString()
            });
        }

        // Check items added
        if (data.items.length !== lastItemCount) {
            if (data.items.length > lastItemCount) {
                // Items were added
                const newItems = data.items.slice(lastItemCount);
                log('🛒 ITEMS ADDED:', newItems.length);
                
                newItems.forEach(item => {
                    if (item && item.name) {
                        log('📦 New item:', item.name, 'Price:', item.Total_price || item.Net_price);
                        sendToServer({
                            type: 'item',
                            name: item.name,
                            price: item.Total_price || item.Net_price || 0,
                            quantity: item.quantity || 1,
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            }
            lastItemCount = data.items.length;
        }
    }

    // Start watching
    setInterval(watchChanges, CONFIG.pollInterval);
    log('Watching for cart changes...');

    // Global API for testing
    window.CustomerDisplay = {
        test: () => sendToServer({ type: 'test', timestamp: new Date().toISOString() }),
        showTotal: (total) => sendToServer({ type: 'total', total, timestamp: new Date().toISOString() }),
        _getData: getVueData
    };
})();
