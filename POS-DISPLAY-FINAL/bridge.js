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

// ─── Try these baud rates in order until display shows correctly ───
// 4800, 9600, 2400, 19200
const BAUD_RATE = 4800;

class DisplayService {
    constructor() {
        this.displayPort = null;
        this.isConnected = false;
        this.lastText = '';

        this.log('Starting Display Service...');
        this.log(`Server: ${config.serverUrl}`);
        this.log(`Baud rate: ${BAUD_RATE}`);

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
                    this.log(`Trying ${portPath} at ${BAUD_RATE} baud...`);
                    try {
                        if (this.displayPort) await this.closePort();

                        this.displayPort = new SerialPort({
                            path: portPath,
                            baudRate: BAUD_RATE,
                            autoOpen: false,
                            dataBits: 8,
                            stopBits: 1,
                            parity: 'none',
                            rtscts: false,
                            xon: false,
                            xoff: false
                        });

                        await new Promise((resolve, reject) => {
                            this.displayPort.open(err => err ? reject(err) : resolve());
                        });

                        this.isConnected = true;
                        this.log(`✅ Display on ${portPath} at ${BAUD_RATE} baud`);

                        // Blank display on startup
                        setTimeout(() => this.showText('        '), 300);
                        return;

                    } catch (err) {
                        this.log(`❌ ${portPath}: ${err.message}`);
                        if (this.displayPort) try { this.displayPort.close(); } catch(e) {}
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
            this.displayPort.close(() => { this.isConnected = false; resolve(); });
        });
    }

    showText(text) {
        if (!this.isConnected) return;
        if (text === this.lastText) return;
        this.lastText = text;

        // CR (0x0D) + exactly 8 chars padded with spaces
        const cr      = Buffer.from([0x0D]);
        const padded  = text.toString().padStart(8, ' ').slice(-8);
        const textBuf = Buffer.from(padded, 'ascii');
        const data    = Buffer.concat([cr, textBuf]);

        this.displayPort.write(data, (err) => {
            if (err) this.log(`❌ Write error: ${err.message}`);
            else this.log(`📺 Display: "${padded}"`);
        });
    }

    formatAmount(total) {
        // Server sends whole TZS units: 20000 → "   20000"
        return Math.round(total).toString();
    }

    async poll() {
        try {
            const data = await this.fetchData();

            if (data.success && data.data) {
                const d = data.data;
                const action = d.action || d.type;

                if (action === 'total' && d.total !== undefined) {
                    this.showText(this.formatAmount(d.total));

                } else if (action === 'item' && (d.itemName || d.name)) {
                    const name = (d.itemName || d.name).substring(0, 8);
                    this.showText(name);
                    if (d.total !== undefined) {
                        setTimeout(() => {
                            this.lastText = '';
                            this.showText(this.formatAmount(d.total));
                        }, 3000);
                    }

                } else if (action === 'clear') {
                    this.lastText = '';
                    this.showText('0');
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
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => {
                    this.log(`Response: ${res.statusCode}, Data: ${body.substring(0, 200)}`);
                    if (res.statusCode !== 200) reject(new Error(`HTTP ${res.statusCode}`));
                    else if (body.trim().startsWith('<')) reject(new Error(`HTML response`));
                    else try { resolve(JSON.parse(body)); } catch(e) { reject(e); }
                });
            });

            req.on('error', reject);
            req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
        });
    }

    startPolling() {
        this.log('Polling started');
        this.poll();
    }
}

new DisplayService();
process.on('SIGINT', () => process.exit());