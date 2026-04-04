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
                        // Close any existing connection
                        if (this.displayPort) {
                            await this.closePort();
                        }
                        
                        this.displayPort = new SerialPort({
                            path: portPath,
                            baudRate: 9600,
                            autoOpen: false
                        });
                        
                        await new Promise((resolve, reject) => {
                            this.displayPort.open(err => {
                                if (err) reject(err);
                                else resolve();
                            });
                        });
                        
                        this.isConnected = true;
                        this.log(`✅ Display on ${portPath}`);
                        this.showText('READY');
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
        
        const textBuf = Buffer.from(text.toString().substring(0, 8));
        
        this.displayPort.write(textBuf, (err) => {
            if (err) {
                this.log(`❌ Write error: ${err.message}`);
                return;
            }
            // Flush to ensure data is sent
            this.displayPort.drain((drainErr) => {
                if (drainErr) this.log(`❌ Drain error: ${drainErr.message}`);
                else this.log(`📺 Display: "${text}"`);
            });
        });
    }
    
    async poll() {
        try {
            const data = await this.fetchData();
            if (data.success && data.data) {
                const d = data.data;
                // Handle both 'action' and 'type' fields
                const action = d.action || d.type;
                
                if (action === 'total' && d.total !== undefined) {
                    // Send raw number only - POS displays need pure digits
                    const formatted = (d.total/100).toFixed(2).replace(/\./g, '');
                    this.showText(formatted);
                } else if (action === 'item' && (d.itemName || d.name)) {
                    this.showText((d.itemName || d.name).substring(0, 16));
                    if (d.total !== undefined) {
                        setTimeout(() => {
                            const formatted = (d.total/100).toFixed(2).replace(/\./g, '');
                            this.showText(formatted);
                        }, 3000);
                    }
                } else if (action === 'clear') {
                    this.showText('0');
                }
            }
        } catch (e) {
            this.log(`Error: ${e.message}`);
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
                    if (res.statusCode !== 200) reject(new Error(`HTTP ${res.statusCode}`));
                    else if (data.trim().startsWith('<')) reject(new Error(`HTML: ${data.substring(0, 100)}`));
                    else try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
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
