/**
 * Customer Display Bridge - Browser Side v6
 * Precisely reads Total Payable from the green bar only
 */
(function() {
    'use strict';

    const CONFIG = {
        serverUrl: 'https://client.ecofieldgroup.com/delight/display-bridge.php',
        pollInterval: 500
    };

    let lastTotal = 0;
    let autoSendEnabled = true;

    // ── Remove any existing widget ────────────────────────────────────
    const existing = document.getElementById('customer-display-widget');
    if (existing) existing.remove();

    // ── UI ────────────────────────────────────────────────────────────
    const div = document.createElement('div');
    div.id = 'customer-display-widget';
    div.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;background:#fff;border:2px solid #4CAF50;padding:10px;border-radius:4px;box-shadow:0 2px 10px rgba(0,0,0,0.2);min-width:200px;';
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

    function setStatus(msg, color) {
        const el = document.getElementById('display-status');
        if (el) { el.textContent = msg; el.style.color = color || '#666'; }
    }
    function setSource(msg) {
        const el = document.getElementById('display-source');
        if (el) el.textContent = msg;
    }

    // ── Read total ONLY from green Total Payable bar ──────────────────
    function getTotalFromDOM() {

        // Look for elements whose DIRECT text contains "Total Payable"
        // and extract TSH amount — must be a leaf-level or near-leaf element
        // to avoid grabbing product barcodes from sibling elements
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null
        );

        let node;
        while ((node = walker.nextNode())) {
            const text = node.textContent.trim();

            // Must contain "Total Payable" AND "TSH" in same text node
            if (/total\s*payable/i.test(text) && /TSH/i.test(text)) {
                // Extract the number right after TSH
                const match = text.match(/TSH\s*([\d,]+\.?\d*)/i);
                if (match) {
                    const val = parseFloat(match[1].replace(/,/g, ''));
                    // Valid total: must be a reasonable number (0 to 999,999,999)
                    if (!isNaN(val) && val >= 0 && val < 1000000000) {
                        console.log('[Display] Found via text node:', val);
                        return { value: Math.round(val), source: 'Total Payable bar' };
                    }
                }
            }
        }

        // Fallback: find the green bar element by background color or known classes
        // From screenshot it's a teal/green button-like div
        const candidates = document.querySelectorAll(
            '.total-payable, .grand-total, .totalPayable, ' +
            '[class*="total-pay"], [class*="grand-tot"], [class*="payable"]'
        );
        for (const el of candidates) {
            if (el.closest('#customer-display-widget')) continue;
            const text = el.textContent || '';
            const match = text.match(/TSH\s*([\d,]+\.?\d*)/i) ||
                          text.match(/([\d,]+\.\d{2})/);
            if (match) {
                const val = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(val) && val >= 0 && val < 1000000000) {
                    console.log('[Display] Found via class selector:', val);
                    return { value: Math.round(val), source: el.className };
                }
            }
        }

        // Last fallback: Vue $data scan
        for (const el of document.querySelectorAll('*')) {
            if (!el.__vue__) continue;
            const vm = el.__vue__;
            const sources = [vm, vm.$data || {}];
            const props = [
                'GrandTotal','grandTotal','grand_total',
                'TotalPayable','totalPayable','NetTotal','netTotal',
                'CartTotal','cartTotal','FinalTotal','finalTotal',
                'totalAmount','TotalAmount','payable','Payable'
            ];
            for (const src of sources) {
                for (const prop of props) {
                    const val = src[prop];
                    if (val !== undefined && !isNaN(parseFloat(val)) &&
                        parseFloat(val) >= 0 && parseFloat(val) < 1000000000) {
                        console.log('[Display] Found Vue prop:', prop, '=', val);
                        return { value: Math.round(parseFloat(val)), source: 'Vue:' + prop };
                    }
                }
            }
        }

        return null;
    }

    // ── Send to server ────────────────────────────────────────────────
    async function sendToServer(total) {
        try {
            setStatus('Sending ' + total + '...', '#999');
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
            console.log('[Display] Sent to display:', total);
        } catch (err) {
            setStatus('❌ ' + err.message, '#f44336');
        }
    }

    // ── Main watch loop ───────────────────────────────────────────────
    function watchAndSend() {
        if (!autoSendEnabled) return;

        const result = getTotalFromDOM();

        if (!result) {
            setSource('⚠️ Cannot find Total Payable');
            return;
        }

        const amount = result.value;
        setSource('📍 ' + result.source);

        // Always update input field
        const input = document.getElementById('display-total');
        if (input) input.value = amount;

        // Only send when value actually changes
        if (amount !== lastTotal) {
            lastTotal = amount;
            if (amount > 0) sendToServer(amount);
            else setStatus('Cart empty (0)', '#999');
        }
    }

    // ── Buttons ───────────────────────────────────────────────────────
    document.getElementById('send-display').onclick = function() {
        const val = parseFloat(document.getElementById('display-total').value);
        if (val > 0) { lastTotal = val; sendToServer(val); }
    };

    document.getElementById('auto-send').onchange = function() {
        autoSendEnabled = this.checked;
        setStatus(autoSendEnabled ? 'Auto ON' : 'Manual mode', '#999');
    };

    // ── Start ─────────────────────────────────────────────────────────
    setInterval(watchAndSend, CONFIG.pollInterval);
    setStatus('Watching...', '#999');
    console.log('[Display] v6 started');

})();