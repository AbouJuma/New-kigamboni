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

                        // Show READY on startup
                        setTimeout(() => this.showText('   READY'), 300);
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

    showText(text) {
        if (!this.isConnected) return;
        if (text === this.lastText) return;
        this.lastText = text;

        // DO NOT use 0x0C — it renders as 'F' on this display
        // Instead: CR → 8 spaces (wipe) → CR → actual text
        const cr      = Buffer.from([0x0D]);
        const blank   = Buffer.from('        ', 'ascii'); // 8 spaces
        const cr2     = Buffer.from([0x0D]);
        const textBuf = Buffer.from(text.toString().substring(0, 8), 'ascii');

        const data = Buffer.concat([cr, blank, cr2, textBuf]);

        this.displayPort.write(data, (err) => {
            if (err) this.log(`❌ Write error: ${err.message}`);
            else this.log(`📺 Display: "${text}"`);
        });
    }

    formatAmount(total) {
        // Server sends whole TZS: 8000 = 8,000/=  7000 = 7,000/=
        // No division needed — display as plain right-aligned integer
        const amount = Math.round(total);
        return amount.toString().padStart(8, ' ').substring(0, 8);
        // e.g. 8000 → "    8000"
        // e.g. 7000 → "    7000"
    }

    async poll() {
        try {
            const data = await this.fetchData();

            if (data.success && data.data) {
                const d = data.data;
                const action = d.action || d.type;

                if (action === 'total' && d.total !== undefined) {
                    const formatted = this.formatAmount(d.total);
                    this.showText(formatted);

                } else if (action === 'item' && (d.itemName || d.name)) {
                    const name = (d.itemName || d.name).substring(0, 8).padEnd(8, ' ');
                    this.showText(name);

                    if (d.total !== undefined) {
                        setTimeout(() => {
                            this.lastText = '';
                            const formatted = this.formatAmount(d.total);
                            this.showText(formatted);
                        }, 3000);
                    }

                } else if (action === 'clear') {
                    this.lastText = '';
                    this.showText('       0');
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