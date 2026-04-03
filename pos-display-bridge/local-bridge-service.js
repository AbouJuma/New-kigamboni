/**
 * Local Bridge Service - Runs on POS Machine
 * Reads display data from PHP server and updates customer display
 * No Node.js required on hosting server
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const { SerialPort } = require('serialport');
const path = require('path');

// Configuration
const config = {
    serverUrl: 'https://client.ecofieldgroup.com/delight/pos-display-bridge/display-bridge.php',
    pollInterval: 1000, // Check server every 1 second
    localDataFile: path.join(__dirname, 'last_display_data.json'),
    logFile: path.join(__dirname, 'bridge.log')
};

class LocalDisplayService {
    constructor() {
        this.displayPort = null;
        this.isConnected = false;
        this.displayType = 'VFD';
        this.lastData = null;
        this.pollingTimer = null;
        
        // Initialize logging
        this.initLogging();
        
        // Load last known data
        this.loadLastData();
        
        // Start polling server
        this.startPolling();
        
        // Graceful shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }
    
    initLogging() {
        this.log('Local Bridge Service Starting...');
        this.log(`Server URL: ${config.serverUrl}`);
        this.log(`Polling Interval: ${config.pollInterval}ms`);
    }
    
    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        console.log(logMessage);
        
        // Write to log file
        try {
            fs.appendFileSync(config.logFile, logMessage);
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }
    
    loadLastData() {
        try {
            if (fs.existsSync(config.localDataFile)) {
                const data = fs.readFileSync(config.localDataFile, 'utf8');
                this.lastData = JSON.parse(data);
                this.log(`Loaded last known data: ${JSON.stringify(this.lastData)}`);
            }
        } catch (error) {
            this.log(`Failed to load last data: ${error.message}`);
        }
    }
    
    saveLastData(data) {
        try {
            fs.writeFileSync(config.localDataFile, JSON.stringify(data, null, 2));
            this.lastData = data;
        } catch (error) {
            this.log(`Failed to save last data: ${error.message}`);
        }
    }
    
    async detectDisplayPort() {
        try {
            const ports = await SerialPort.list();
            this.log(`Available ports: ${JSON.stringify(ports.map(p => p.path))}`);
            
            // Look for VFD/Display ports
            const displayPorts = ports.filter(port => {
                const name = (port.friendlyName || port.manufacturer || '').toLowerCase();
                return name.includes('pole') || 
                       name.includes('display') || 
                       name.includes('vfd') || 
                       name.includes('customer') ||
                       name.includes('pos');
            });
            
            if (displayPorts.length > 0) {
                this.log(`Found display port: ${displayPorts[0].path}`);
                return displayPorts[0].path;
            } else if (ports.length > 0) {
                this.log(`Using first available port: ${ports[0].path}`);
                return ports[0].path;
            }
            
            return null;
        } catch (error) {
            this.log(`Port detection error: ${error.message}`);
            return null;
        }
    }
    
    async connectDisplay(portPath = null) {
        try {
            if (!portPath) {
                portPath = await this.detectDisplayPort();
            }
            
            if (!portPath) {
                this.log('No display port found - running in simulation mode');
                return false;
            }
            
            this.displayPort = new SerialPort({
                path: portPath,
                baudRate: 9600,
                dataBits: 8,
                stopBits: 1,
                parity: 'none'
            });
            
            return new Promise((resolve, reject) => {
                this.displayPort.on('open', () => {
                    this.log(`Connected to display on ${portPath}`);
                    this.isConnected = true;
                    this.initializeDisplay();
                    resolve(true);
                });
                
                this.displayPort.on('error', (error) => {
                    this.log(`Display error: ${error.message}`);
                    this.isConnected = false;
                    reject(error);
                });
            });
        } catch (error) {
            this.log(`Failed to connect to display: ${error.message}`);
            return false;
        }
    }
    
    initializeDisplay() {
        if (!this.isConnected) return;
        
        if (this.displayType === 'VFD') {
            this.sendCommand([0x1B, 0x40]); // Initialize
            this.sendCommand([0x1B, 0x4D]); // Set brightness
        } else if (this.displayType === 'ESCPOS') {
            this.sendCommand([0x1B, 0x40]); // Initialize
            this.sendCommand([0x1B, 0x21, 0x08]); // Double height
        }
    }
    
    sendCommand(command) {
        if (!this.isConnected || !this.displayPort) return;
        
        try {
            const buffer = Buffer.isArray(command) ? Buffer.from(command) : Buffer.from(command);
            this.displayPort.write(buffer);
        } catch (error) {
            this.log(`Command send error: ${error.message}`);
        }
    }
    
    clearDisplay() {
        if (!this.isConnected) {
            this.log('[SIMULATION] Clear display');
            return;
        }
        
        if (this.displayType === 'VFD') {
            this.sendCommand([0x0C]); // Clear display
        } else if (this.displayType === 'ESCPOS') {
            this.sendCommand([0x1B, 0x40]); // Initialize/clear
        }
    }
    
    displayText(text) {
        if (!this.isConnected) {
            this.log(`[SIMULATION] Display: ${text}`);
            return;
        }
        
        try {
            if (this.displayType === 'VFD') {
                this.sendCommand(text.padEnd(40, ' ').substring(0, 40));
            } else if (this.displayType === 'ESCPOS') {
                this.sendCommand(text + '\r\n');
            }
        } catch (error) {
            this.log(`Display text error: ${error.message}`);
        }
    }
    
    displayTotal(total) {
        const totalText = `TOTAL: ${total.toLocaleString()}`;
        this.displayText(totalText);
        this.log(`Displaying total: ${total}`);
    }
    
    displayItem(itemName, price) {
        const itemText = `${itemName}: ${price.toLocaleString()}`;
        this.displayText(itemText);
        this.log(`Displaying item: ${itemName} - ${price}`);
        
        // Clear item display and show total after 3 seconds
        setTimeout(() => {
            if (this.lastData && this.lastData.total) {
                this.displayTotal(this.lastData.total);
            }
        }, 3000);
    }
    
    async fetchServerData() {
        return new Promise((resolve, reject) => {
            const url = new URL(config.serverUrl);
            const isHttps = url.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const req = client.request({
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'LocalBridgeService/1.0',
                    'Accept': 'application/json'
                }
            }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (error) {
                        reject(new Error(`JSON parse error: ${error.message}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            req.end();
        });
    }
    
    async processServerData(response) {
        try {
            if (!response.success || !response.data) {
                return;
            }
            
            const data = response.data;
            
            // Check if data has changed
            const dataChanged = JSON.stringify(data) !== JSON.stringify(this.lastData);
            
            if (dataChanged) {
                this.log(`Data changed: ${JSON.stringify(data)}`);
                this.saveLastData(data);
                
                // Process display commands
                if (data.action === 'clear') {
                    this.clearDisplay();
                } else if (data.action === 'item' && data.itemName && data.price) {
                    this.displayItem(data.itemName, parseFloat(data.price) / 100);
                } else if (data.total !== undefined) {
                    this.displayTotal(parseFloat(data.total) / 100);
                }
                
                // Update display type if specified
                if (data.displayType && data.displayType !== this.displayType) {
                    this.displayType = data.displayType;
                    this.initializeDisplay();
                }
            }
        } catch (error) {
            this.log(`Process data error: ${error.message}`);
        }
    }
    
    async startPolling() {
        this.log('Starting server polling...');
        
        const poll = async () => {
            try {
                const response = await this.fetchServerData();
                await this.processServerData(response);
            } catch (error) {
                this.log(`Polling error: ${error.message}`);
            }
        };
        
        // Initial poll
        poll();
        
        // Set up recurring polling
        this.pollingTimer = setInterval(poll, config.pollInterval);
    }
    
    stopPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
            this.log('Stopped polling');
        }
    }
    
    shutdown() {
        this.log('Shutting down...');
        this.stopPolling();
        
        if (this.isConnected) {
            this.clearDisplay();
            if (this.displayPort) {
                this.displayPort.close();
            }
        }
        
        process.exit(0);
    }
}

// Start the service
const service = new LocalDisplayService();
