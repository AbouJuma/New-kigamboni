/**
 * Customer Display Bridge - Browser Side v5
 * Reads Total Payable directly from DOM green bar
 */
(function() {
    'use strict';

    const CONFIG = {
        serverUrl: 'https://client.ecofieldgroup.com/delight/display-bridge.php',
        pollInterval: 500
    };

    let lastTotal = 0;
    let autoSendEnabled = true;

    // ── UI ────────────────────────────────────────────────────────────
    // Remove any existing display widget first
    const existing = document.getElementById('customer-display-widget');
    if (existing) existing.remove();

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

    // ── Read total from Vue instance ───────────────────────────────────
    function getTotalFromDOM() {
        // Strategy 1: Vue instance scan
        for (const el of document.querySelectorAll('*')) {
            if (!el.__vue__) continue;
            const vm = el.__vue__;
            
            // Look specifically for GrandTotal
            if (vm.GrandTotal !== undefined && vm.GrandTotal > 0) {
                console.log('[Display] Found GrandTotal in Vue:', vm.GrandTotal);
                return { value: vm.GrandTotal, source: 'Vue:GrandTotal' };
            }
            
            // Also check $data
            if (vm.$data && vm.$data.GrandTotal !== undefined && vm.$data.GrandTotal > 0) {
                console.log('[Display] Found GrandTotal in Vue $data:', vm.$data.GrandTotal);
                return { value: vm.$data.GrandTotal, source: 'Vue:$data.GrandTotal' };
            }
        }
        
        // Strategy 2: DOM - find "Total Payable" text
        const allEls = document.querySelectorAll('*');
        for (const el of allEls) {
            if (['SCRIPT','STYLE','HEAD'].includes(el.tagName)) continue;
            if (el.closest('#customer-display-widget')) continue;
            
            const text = el.childNodes.length === 1 || el.children.length === 0
                ? el.textContent || ''
                : '';
                
            if (/total\s*payable/i.test(text)) {
                const match = text.match(/([\d,]+\.?\d*)/g);
                if (match && match.length > 0) {
                    // Take the LAST number (should be the total)
                    const total = parseFloat(match[match.length - 1].replace(/,/g, ''));
                    if (total > 0) {
                        console.log('[Display] Found Total Payable:', total);
                        return { value: total, source: 'DOM:Total Payable' };
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
            console.error('[Display] Error:', err.message);
        }
    }

    // ── Main watch loop ───────────────────────────────────────────────
    function watchAndSend() {
        if (!autoSendEnabled) return;

        const result = getTotalFromDOM();

        if (!result) {
            setSource('⚠️ Cannot find total on page');
            return;
        }

        const amount = result.value;
        setSource('📍 ' + result.source);

        // Always update the input field
        const input = document.getElementById('display-total');
        if (input) input.value = amount;

        // Only send when value changes
        if (amount !== lastTotal && amount > 0) {
            lastTotal = amount;
            sendToServer(amount);
        }
    }

    // ── Button handlers ───────────────────────────────────────────────
    document.getElementById('send-display').onclick = function() {
        const val = parseFloat(document.getElementById('display-total').value);
        if (val > 0) {
            lastTotal = val;
            sendToServer(val);
        }
    };

    document.getElementById('auto-send').onchange = function() {
        autoSendEnabled = this.checked;
        setStatus(autoSendEnabled ? 'Auto ON' : 'Manual mode', '#999');
    };

    // ── Start ─────────────────────────────────────────────────────────
    setInterval(watchAndSend, CONFIG.pollInterval);
    setStatus('Watching for Total Payable...', '#999');
    console.log('[Display] v5 started');

})();