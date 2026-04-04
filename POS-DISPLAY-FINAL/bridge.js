/**
 * POS Customer Display Bridge - Local Service
 * Runs on POS machine to read from server and update customer display
 */

const https = require('https');
const { SerialPort } = require('serialport');
const path = require('path');
const fs = require('fs');

// Configuration
const config = {
    serverUrl: 'https://client.ecofieldgroup.com/delight/display-bridge.php',
    pollInterval: 5000,
    logFile: path.join(__dirname, 'bridge.log')
};

class DisplayService {
    constructor() {
        this.displayPort = null;
        this.isConnected = false;
        this.lastData = null;
        this.lastText = '';

        this.log('Starting Display Service...');
        this.log(`Server: ${config.serverUrl}`);

        this.connectDisplay();
        this.startPolling();
    }

    log(msg) {
        const entry = `[${new Date().toISOString()}] ${msg}`;
        console.log(entry);
        try { fs.appendFileSync(config.logFile, entry + '\n'); } catch(e) {}
    }

    async connectDisplay() {
        try {
            const ports = await SerialPort.list();
            this.log(`Ports: ${ports.map(p => p.path).join(', ')}`);

            for (const portPath of ['COM1', 'COM2']) {
                if (ports.some(p => p.path === portPath)) {
                    this.log(`Trying ${portPath}...`);
                    try {
                        if (this.displayPort) {
                            await this.closePort();
                        }

                        this.displayPort = new SerialPort({
                            path: portPath,
                            baudRate: 9600,
                            autoOpen: false,
                            dataBits: 8,
                            stopBits: 1,
                            parity: 'none',
                            rtscts: false,
                            xon: false,
                            xoff: false
                        });

                        await new Promise((resolve, reject) => {
                            this.displayPort.open(err => {
                                if (err) reject(err);
                                else resolve();
                            });
                        });

                        this.isConnected = true;
                        this.log(`✅ Display on ${portPath}`);

                        // Send initial clear + ready message
                        this.clearDisplay();
                        setTimeout(() => this.showText('   READY'), 500);
                        return;

                    } catch (err) {
                        this.log(`❌ ${portPath}: ${err.message}`);
                        if (this.displayPort) {
                            try { this.displayPort.close(); } catch(e) {}
                        }
                    }
                }
            }
            this.log('No display found');
        } catch (error) {
            this.log(`Error: ${error.message}`);
        }
    }

    async closePort() {
        return new Promise(resolve => {
            if (!this.displayPort) return resolve();
            this.displayPort.close(err => {
                this.isConnected = false;
                resolve();
            });
        });
    }

    clearDisplay() {
        if (!this.isConnected) return;
        // 0x0C = Form Feed = clear screen on most pole displays
        // 0x0D = Carriage Return = move cursor to start
        const clearBuf = Buffer.from([0x0C, 0x0D]);
        this.displayPort.write(clearBuf, (err) => {
            if (err) this.log(`❌ Clear error: ${err.message}`);
            else this.log('🧹 Display cleared');
        });
    }

    showText(text) {
        if (!this.isConnected) return;
        if (text === this.lastText) return;
        this.lastText = text;

        // 0x0C = Form Feed (clear display)
        // 0x0D = Carriage Return (cursor to home)
        const clear   = Buffer.from([0x0C]);
        const home    = Buffer.from([0x0D]);

        // Allow up to 9 chars to accommodate decimal point (e.g. " 800.36 ")
        const padded  = text.toString().substring(0, 9);
        const textBuf = Buffer.from(padded, 'ascii');

        const data = Buffer.concat([clear, home, textBuf]);

        this.displayPort.write(data, (err) => {
            if (err) this.log(`❌ Write error: ${err.message}`);
            else this.log(`📺 Display: "${text}"`);
        });
    }

    formatAmount(totalInCents) {
        // Server sends total in cents: 80036 => 800.36, 50000 => 500.00
        const amount = (totalInCents / 100).toFixed(2);   // e.g. "800.36"
        // Right-align in 8 chars (dot counts as a char here)
        return amount.padStart(8, ' ').substring(0, 8);   // e.g. "  800.36"
    }

    async poll() {
        try {
            const data = await this.fetchData();

            if (data.success && data.data) {
                const d = data.data;
                const action = d.action || d.type;

                if (action === 'total' && d.total !== undefined) {
                    // total is in cents: 80036 = 800.36 TZS
                    const formatted = this.formatAmount(d.total);
                    this.showText(formatted);

                } else if (action === 'item' && (d.itemName || d.name)) {
                    // Show item name first (max 8 chars)
                    const name = (d.itemName || d.name).substring(0, 8).padEnd(8, ' ');
                    this.showText(name);

                    // Then show item price after 3 seconds
                    if (d.total !== undefined) {
                        setTimeout(() => {
                            const formatted = this.formatAmount(d.total);
                            this.showText(formatted);
                        }, 3000);
                    }

                } else if (action === 'clear') {
                    this.lastText = ''; // force re-send even if same
                    this.showText('    0.00');
                }
            }
        } catch (e) {
            this.log(`Poll error: ${e.message}`);
        }

        setTimeout(() => this.poll(), config.pollInterval);
    }

    fetchData() {
        return new Promise((resolve, reject) => {
            const url = new URL(config.serverUrl);
            const options = {
                hostname: url.hostname,
                path: url.pathname,
                port: 443,
                headers: {
                    'Host': url.hostname,
                    'User-Agent': 'curl/8.13.0',
                    'Accept': '*/*',
                    'Connection': 'close'
                }
            };

            const req = https.get(options, res => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    this.log(`Response: ${res.statusCode}, Data: ${data.substring(0, 200)}`);
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    } else if (data.trim().startsWith('<')) {
                        reject(new Error(`HTML response: ${data.substring(0, 100)}`));
                    } else {
                        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    startPolling() {
        this.log('Polling started');
        this.poll();
    }
}

new DisplayService();
process.on('SIGINT', () => process.exit());