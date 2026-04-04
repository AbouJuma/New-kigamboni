/**
 * Customer Display Bridge - Browser Side v4
 * Auto-detects grand total from Vue and sends to display
 */
(function() {
    'use strict';

    const CONFIG = {
        serverUrl: 'https://client.ecofieldgroup.com/delight/display-bridge.php',
        pollInterval: 500
    };

    let lastTotal = 0;
    let autoSendEnabled = true;
    let foundVueProp = null; // cache which property name worked

    // ── UI ────────────────────────────────────────────────────────────
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;background:#fff;border:2px solid #4CAF50;padding:10px;border-radius:4px;box-shadow:0 2px 10px rgba(0,0,0,0.2);min-width:180px;';
    div.innerHTML = `
        <div style="font-weight:bold;margin-bottom:5px;">📺 Customer Display</div>
        <input type="number" id="display-total" placeholder="Total (TSH)" style="width:110px;padding:5px;margin-right:5px;">
        <button id="send-display" style="background:#4CAF50;color:white;border:none;padding:5px 10px;cursor:pointer;border-radius:3px;">Send</button>
        <br><label style="margin-top:5px;display:inline-block;font-size:12px;">
            <input type="checkbox" id="auto-send" checked> Auto-detect
        </label>
        <div id="display-status" style="margin-top:5px;font-size:11px;color:#666;"></div>
        <div id="display-source" style="font-size:10px;color:#999;"></div>
    `;
    document.body.appendChild(div);

    // ── Helpers ───────────────────────────────────────────────────────
    function setStatus(msg, color) {
        document.getElementById('display-status').textContent = msg;
        document.getElementById('display-status').style.color = color || '#666';
    }

    function setSource(msg) {
        document.getElementById('display-source').textContent = msg;
    }

    // ── Find Vue instance by scanning ALL elements ────────────────────
    function findVueInstance() {
        // Vue 2: element.__vue__
        // Vue 3: element.__vue_app__
        for (const el of document.querySelectorAll('*')) {
            if (el.__vue__)     return el.__vue__;
            if (el.__vue_app__) {
                // Vue 3 - get root component instance
                const app = el.__vue_app__;
                if (app._instance) return app._instance.proxy || app._instance;
            }
        }
        return null;
    }

    // ── Try many possible property names for grand total ─────────────
    const TOTAL_PROPS = [
        'GrandTotal', 'grandTotal', 'grand_total',
        'totalAmount', 'total_amount', 'TotalAmount',
        'cartTotal', 'cart_total', 'CartTotal',
        'subTotal', 'SubTotal', 'subtotal',
        'finalTotal', 'FinalTotal',
        'totalPrice', 'TotalPrice', 'total_price',
        'netTotal', 'NetTotal',
        'payable', 'Payable', 'totalPayable', 'TotalPayable',
        'amount', 'Amount', 'totalDue', 'TotalDue'
    ];

    function getVueTotal() {
        // Find any element with __vue__ property
        const allElements = document.querySelectorAll('*');
        let vm = null;
        
        for (let el of allElements) {
            if (el.__vue__) {
                // Check if this Vue instance has GrandTotal
                if (el.__vue__.GrandTotal !== undefined) {
                    vm = el.__vue__;
                    break;
                }
                // Also check _data
                if (el.__vue__._data && el.__vue__._data.GrandTotal !== undefined) {
                    vm = el.__vue__;
                    break;
                }
            }
        }
        
        if (!vm) {
            console.log('[Display] No Vue instance with GrandTotal found');
            return null;
        }
        
        console.log('[Display] Vue found with GrandTotal:', vm.GrandTotal);
        return { raw: vm.GrandTotal, prop: 'Vue:GrandTotal' };
    }

    // ── DOM fallback ──────────────────────────────────────────────────
    function getDOMTotal() {
        const selectors = [
            '.total-payable', '.grand-total', '.total-amount',
            '.cart-total', '.order-total', '.summary-total',
            '[class*="grand"]', '[class*="total"]', '[class*="payable"]'
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
                const text = el.textContent || '';
                const match = text.match(/[\d,]+\.?\d*/);
                if (match) {
                    const val = parseFloat(match[0].replace(/,/g, ''));
                    if (val > 0) return { raw: val, prop: 'DOM:' + sel };
                }
            }
        }
        return null;
    }

    // ── Convert raw value to display amount ───────────────────────────
    function toDisplayAmount(raw) {
        const n = parseFloat(raw);
        // If value looks like it's in cents (suspiciously large for TZS display)
        // e.g. 1000 for a 10 TSH item — divide by 100
        // We detect this by checking if it's a round multiple of 100 and > 10000
        // Actually: let user toggle this if needed. Default: send as-is.
        // The /100 issue was in old code. Current bridge.js does NOT divide.
        // So send the raw value directly.
        return Math.round(n);
    }

    // ── Send to server ────────────────────────────────────────────────
    async function sendToServer(total) {
        try {
            setStatus('Sending...', '#999');
            const response = await fetch(CONFIG.serverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'total',
                    type: 'total',
                    total: total,
                    timestamp: new Date().toISOString()
                })
            });
            const result = await response.json();
            setStatus('✅ Sent: TSH ' + total.toLocaleString(), '#4CAF50');
            console.log('[Display] Sent:', total);
        } catch (err) {
            setStatus('❌ ' + err.message, '#f44336');
        }
    }

    // ── Main watch loop ───────────────────────────────────────────────
    function watchAndSend() {
        if (!autoSendEnabled) return;

        // Try Vue first, then DOM
        const result = getVueTotal() || getDOMTotal();

        if (!result) {
            setSource('⚠️ Source not found');
            return;
        }

        const amount = toDisplayAmount(result.raw);
        setSource('Source: ' + result.prop);

        // ALWAYS update input field to show current detected value
        const input = document.getElementById('display-total');
        if (input && input.value !== String(amount)) {
            input.value = amount;
        }

        // Only SEND when amount actually changes
        if (amount !== lastTotal && amount > 0) {
            lastTotal = amount;
            sendToServer(amount);
        }
    }

    // ── Button handlers ───────────────────────────────────────────────
    document.getElementById('send-display').onclick = function() {
        const val = parseFloat(document.getElementById('display-total').value);
        if (val > 0) {
            lastTotal = val; // prevent double-send
            sendToServer(val);
        }
    };

    document.getElementById('auto-send').onchange = function() {
        autoSendEnabled = this.checked;
        setStatus(autoSendEnabled ? 'Auto-detect ON' : 'Manual mode', '#999');
    };

    // ── Start ─────────────────────────────────────────────────────────
    setInterval(watchAndSend, CONFIG.pollInterval);
    setStatus('Watching...', '#999');
    console.log('[Display] v4 started — add items to cart to test');

})();