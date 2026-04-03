const express = require('express');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Customer Display Service
class CustomerDisplayService {
    constructor() {
        this.port = null;
        this.parser = null;
        this.isConnected = false;
        this.displayType = 'VFD'; // Default to VFD, can be 'ESCPOS' or 'VFD'
        this.lastTotal = 0;
        this.itemDisplayTimeout = null;
    }

    async detectDisplayPort() {
        try {
            const ports = await SerialPort.list();
            console.log('Available COM ports:', ports.map(p => `${p.path} - ${p.friendlyName || p.manufacturer || 'Unknown'}`));
            
            // Common VFD/POLE display port patterns
            const displayPorts = ports.filter(port => {
                const name = (port.friendlyName || port.manufacturer || '').toLowerCase();
                return name.includes('pole') || 
                       name.includes('display') || 
                       name.includes('vfd') || 
                       name.includes('customer') ||
                       name.includes('pos') ||
                       path.basename(port.path).toLowerCase().includes('com');
            });

            if (displayPorts.length > 0) {
                console.log(`Found potential display port: ${displayPorts[0].path}`);
                return displayPorts[0].path;
            } else if (ports.length > 0) {
                console.log(`Using first available port: ${ports[0].path}`);
                return ports[0].path;
            }
            
            return null;
        } catch (error) {
            console.error('Error detecting ports:', error);
            return null;
        }
    }

    async connect(portPath = null) {
        try {
            if (!portPath) {
                portPath = await this.detectDisplayPort();
            }

            if (!portPath) {
                console.log('No display port found. Running in simulation mode.');
                return false;
            }

            this.port = new SerialPort({
                path: portPath,
                baudRate: 9600,
                dataBits: 8,
                stopBits: 1,
                parity: 'none'
            });

            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

            this.port.on('open', () => {
                console.log(`Connected to display on ${portPath}`);
                this.isConnected = true;
                this.clearDisplay();
                this.initializeDisplay();
            });

            this.port.on('error', (err) => {
                console.error('Serial port error:', err);
                this.isConnected = false;
            });

            this.parser.on('data', (data) => {
                console.log('Display response:', data);
            });

            return true;
        } catch (error) {
            console.error('Failed to connect to display:', error);
            return false;
        }
    }

    initializeDisplay() {
        if (!this.isConnected) return;

        if (this.displayType === 'VFD') {
            // VFD initialization commands
            this.sendCommand([0x1B, 0x40]); // Initialize
            this.sendCommand([0x1B, 0x4D]); // Set brightness
        } else if (this.displayType === 'ESCPOS') {
            // ESC/POS initialization
            this.sendCommand([0x1B, 0x40]); // Initialize
            this.sendCommand([0x1B, 0x21, 0x08]); // Double height
        }
    }

    clearDisplay() {
        if (!this.isConnected) return;

        if (this.displayType === 'VFD') {
            this.sendCommand([0x0C]); // Clear display
        } else if (this.displayType === 'ESCPOS') {
            this.sendCommand([0x1B, 0x40]); // Initialize/clear
        }
    }

    sendCommand(command) {
        if (!this.isConnected || !this.port) return;

        try {
            if (Array.isArray(command)) {
                this.port.write(Buffer.from(command));
            } else {
                this.port.write(command);
            }
        } catch (error) {
            console.error('Error sending command:', error);
        }
    }

    displayText(text) {
        if (!this.isConnected) {
            console.log(`[SIMULATION] Display: ${text}`);
            return;
        }

        try {
            // Clear any existing item display timeout
            if (this.itemDisplayTimeout) {
                clearTimeout(this.itemDisplayTimeout);
            }

            // Send text to display
            if (this.displayType === 'VFD') {
                this.sendCommand(text.padEnd(40, ' ').substring(0, 40));
            } else if (this.displayType === 'ESCPOS') {
                this.sendCommand(text + '\r\n');
            }
        } catch (error) {
            console.error('Error displaying text:', error);
        }
    }

    displayTotal(total) {
        const totalText = `TOTAL: ${total.toLocaleString()}`;
        this.displayText(totalText);
        this.lastTotal = total;
    }

    displayItem(itemName, price) {
        const itemText = `${itemName}: ${price.toLocaleString()}`;
        this.displayText(itemText);
        
        // Clear item display and show total after 3 seconds
        this.itemDisplayTimeout = setTimeout(() => {
            this.displayTotal(this.lastTotal);
        }, 3000);
    }

    setDisplayType(type) {
        this.displayType = type;
        this.initializeDisplay();
    }
}

// Initialize display service
const displayService = new CustomerDisplayService();

// API Routes
app.get('/', (req, res) => {
    res.json({ 
        status: 'POS Display Bridge Running',
        connected: displayService.isConnected,
        displayType: displayService.displayType
    });
});

app.post('/display', async (req, res) => {
    try {
        const { total, action, itemName, price, displayType } = req.body;

        // Update display type if specified
        if (displayType) {
            displayService.setDisplayType(displayType);
        }

        // Connect if not already connected
        if (!displayService.isConnected) {
            await displayService.connect();
        }

        switch (action) {
            case 'clear':
                displayService.clearDisplay();
                break;
            case 'item':
                if (itemName && price) {
                    displayService.displayItem(itemName, price);
                }
                break;
            case 'total':
            default:
                if (total !== undefined) {
                    displayService.displayTotal(total);
                }
                break;
        }

        res.json({ 
            success: true, 
            connected: displayService.isConnected,
            message: 'Display updated successfully'
        });
    } catch (error) {
        console.error('Error handling display request:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/connect', async (req, res) => {
    try {
        const { portPath, displayType } = req.body;
        
        if (displayType) {
            displayService.setDisplayType(displayType);
        }
        
        const connected = await displayService.connect(portPath);
        res.json({ 
            success: connected, 
            port: portPath || 'auto-detected',
            displayType: displayService.displayType
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/ports', async (req, res) => {
    try {
        const ports = await SerialPort.list();
        res.json({ ports });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, async () => {
    console.log(`POS Display Bridge running on port ${PORT}`);
    
    // Auto-connect to display
    setTimeout(async () => {
        await displayService.connect();
    }, 1000);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    if (displayService.isConnected) {
        displayService.clearDisplay();
        displayService.port.close();
    }
    process.exit(0);
});
