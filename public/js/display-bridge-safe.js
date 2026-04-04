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

    // Watch for changes
    function watchChanges() {
        const data = getVueData();
        if (!data) return;

        // Check total changed
        if (data.total !== null && data.total !== lastTotal) {
            lastTotal = data.total;
            log('Total:', lastTotal);
            sendToServer({
                type: 'total',
                total: lastTotal,
                timestamp: new Date().toISOString()
            });
        }

        // Check items added
        if (data.items.length > lastItemCount) {
            const newItems = data.items.slice(lastItemCount);
            lastItemCount = data.items.length;
            
            newItems.forEach(item => {
                if (item && item.name) {
                    log('Item:', item.name);
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
