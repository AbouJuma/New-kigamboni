/**
 * Optimized Local Bridge Service - Reduced Server Load
 * Polling every 10 seconds, caching data, better error handling
 */

const https = require('https');
const { SerialPort } = require('serialport');
const path = require('path');
const fs = require('fs');

// Optimized Configuration
const config = {
    serverUrl: 'https://client.ecofieldgroup.com/delight/pos-display-bridge',
    pollInterval: 10000,      // 10 seconds (was 1-2 seconds)
    errorRetryInterval: 30000,  // 30 seconds on error
    displayTimeout: 5000,     // 5 second request timeout
    logFile: path.join(__dirname, 'bridge.log')
};

class OptimizedDisplayService {
    constructor() {
        this.displayPort = null;
        this.isConnected = false;
        this.lastData = null;
        this.lastDisplayText = '';
        this.consecutiveErrors = 0;
        this.maxErrorsBeforeBackoff = 5;
        
        this.log('🚀 Optimized Display Service Starting...');
        this.log(`Server: ${config.serverUrl}`);
        this.log(`Poll interval: ${config.pollInterval}ms`);
        
        this.findAndConnectDisplay();
        this.startPolling();
        
        process.on('SIGINT', () => this.shutdown());
    }
    
    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(logEntry);
        try {
            fs.appendFileSync(config.logFile, logEntry + '\n');
        } catch (e) {}
    }
    
    async findAndConnectDisplay() {
        try {
            const ports = await SerialPort.list();
            this.log(`Ports: ${ports.map(p => p.path).join(', ')}`);
            
            for (const portPath of ['COM1', 'COM2']) {
                if (ports.some(p => p.path === portPath)) {
                    this.log(`Trying ${portPath}...`);
                    if (await this.tryConnect(portPath)) {
                        this.log(`✅ Display on ${portPath}`);
                        this.showText('READY');
                        return;
                    }
                }
            }
            this.log('❌ No display');
        } catch (error) {
            this.log(`Display error: ${error.message}`);
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
        
        // Only update if text changed
        if (text === this.lastDisplayText) return;
        this.lastDisplayText = text;
        
        const padded = text.toString().substring(0, 20).padEnd(20, ' ');
        this.displayPort.write(padded);
        this.log(`📺 ${text}`);
    }
    
    async fetchServerData() {
        return new Promise((resolve, reject) => {
            const url = new URL(config.serverUrl);
            const options = {
                hostname: url.hostname,
                path: url.pathname + '/index.php',  // Explicitly call index.php
                port: 443,
                method: 'GET',
                timeout: config.displayTimeout,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'POS-Display-Bridge/1.0'
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}`));
                        return;
                    }
                    try {
                        // Check if response starts with HTML
                        if (data.trim().startsWith('<')) {
                            reject(new Error('Server returned HTML instead of JSON'));
                            return;
                        }
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        reject(new Error(`JSON parse: ${e.message}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
            
            req.end();
        });
    }
    
    async startPolling() {
        this.log('Starting polling...');
        
        const poll = async () => {
            let interval = config.pollInterval;
            
            try {
                const response = await this.fetchServerData();
                this.consecutiveErrors = 0; // Reset error count on success
                
                if (response.success && response.data) {
                    const data = response.data;
                    
                    // Only process if data changed
                    const dataHash = JSON.stringify(data);
                    if (dataHash === this.lastData) {
                        // Data unchanged, skip display update
                    } else {
                        this.lastData = dataHash;
                        
                        if (data.action === 'total' && data.total !== undefined) {
                            const amount = (data.total / 100).toFixed(2);
                            this.showText(`TOTAL: ${amount}`);
                        } else if (data.action === 'item' && data.itemName) {
                            this.showText(data.itemName.substring(0, 16));
                            // Show item for 3 seconds, then return to total
                            if (data.total !== undefined) {
                                setTimeout(() => {
                                    const amount = (data.total / 100).toFixed(2);
                                    this.showText(`TOTAL: ${amount}`);
                                }, 3000);
                            }
                        } else if (data.action === 'clear') {
                            this.showText('');
                        }
                    }
                }
            } catch (error) {
                this.consecutiveErrors++;
                this.log(`Error (${this.consecutiveErrors}): ${error.message}`);
                
                // Back off on repeated errors
                if (this.consecutiveErrors >= this.maxErrorsBeforeBackoff) {
                    interval = config.errorRetryInterval;
                    this.log(`Backing off: ${interval}ms interval`);
                }
            }
            
            setTimeout(poll, interval);
        };
        
        poll();
    }
    
    shutdown() {
        this.log('Shutting down...');
        process.exit(0);
    }
}

new OptimizedDisplayService();
