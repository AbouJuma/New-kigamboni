/**
 * Local Bridge Service - Runs on POS Machine
 * Reads display data from PHP server and updates customer display
 */

const https = require('https');
const http = require('http');
const { SerialPort } = require('serialport');
const path = require('path');

// Configuration - FIXED URL
const config = {
    serverUrl: 'https://client.ecofieldgroup.com/delight/pos-display-bridge',
    pollInterval: 2000,
    logFile: path.join(__dirname, 'bridge.log')
};

class LocalDisplayService {
    constructor() {
        this.displayPort = null;
        this.isConnected = false;
        this.lastData = null;
        
        this.log('Local Bridge Service Starting...');
        this.log(`Server URL: ${config.serverUrl}`);
        
        this.findAndConnectDisplay();
        this.startPolling();
        
        process.on('SIGINT', () => this.shutdown());
    }
    
    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        console.log(logEntry.trim());
        try {
            const fs = require('fs');
            fs.appendFileSync(config.logFile, logEntry);
        } catch (e) {}
    }
    
    async findAndConnectDisplay() {
        try {
            const ports = await SerialPort.list();
            this.log(`Available ports: ${ports.map(p => p.path).join(', ')}`);
            
            // Try COM1 and COM2 first
            for (const portPath of ['COM1', 'COM2']) {
                if (ports.some(p => p.path === portPath)) {
                    this.log(`Trying ${portPath}...`);
                    if (await this.tryConnect(portPath)) {
                        this.log(`✅ Connected to ${portPath}`);
                        this.showText('READY');
                        return;
                    }
                }
            }
            this.log('❌ No display found');
        } catch (error) {
            this.log(`Error finding display: ${error.message}`);
        }
    }
    
    async tryConnect(portPath) {
        return new Promise((resolve) => {
            try {
                this.displayPort = new SerialPort({
                    path: portPath,
                    baudRate: 9600,
                    autoOpen: false
                });
                
                this.displayPort.open((err) => {
                    if (err) {
                        resolve(false);
                        return;
                    }
                    this.isConnected = true;
                    resolve(true);
                });
                
                setTimeout(() => {
                    if (!this.isConnected) {
                        try { this.displayPort.close(); } catch(e) {}
                        resolve(false);
                    }
                }, 2000);
            } catch (e) {
                resolve(false);
            }
        });
    }
    
    showText(text) {
        if (!this.isConnected || !this.displayPort) return;
        const padded = text.toString().substring(0, 20).padEnd(20, ' ');
        this.displayPort.write(padded);
        this.log(`📺 Display: "${text}"`);
    }
    
    async pollServer() {
        return new Promise((resolve, reject) => {
            const url = new URL(config.serverUrl);
            const options = {
                hostname: url.hostname,
                path: url.pathname,
                port: 443,
                method: 'GET',
                timeout: 5000,
                headers: {
                    'Accept': 'application/json'
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        reject(new Error(`JSON parse error: ${e.message}. Data: ${data.substring(0, 100)}`));
                    }
                });
            });
            
            req.on('error', (error) => reject(error));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            req.end();
        });
    }
    
    async startPolling() {
        this.log('Starting server polling...');
        
        const poll = async () => {
            try {
                const data = await this.pollServer();
                
                if (data.success && data.data) {
                    const displayData = data.data;
                    
                    if (displayData.action === 'total' && displayData.total !== undefined) {
                        const amount = (displayData.total / 100).toFixed(2);
                        this.showText(`TOTAL: ${amount}`);
                        this.log(`Updated total: ${amount}`);
                    } else if (displayData.action === 'item' && displayData.itemName) {
                        this.showText(displayData.itemName);
                        this.log(`Showed item: ${displayData.itemName}`);
                    } else if (displayData.action === 'clear') {
                        this.showText('');
                        this.log('Cleared display');
                    }
                }
            } catch (error) {
                this.log(`Polling error: ${error.message}`);
            }
            
            setTimeout(poll, config.pollInterval);
        };
        
        poll();
    }
    
    shutdown() {
        this.log('Shutting down...');
        process.exit(0);
    }
}

new LocalDisplayService();
