/**
 * Super Simple Local Display Service
 * No server needed - browser talks directly to COM port
 * For VFD customer displays
 */

const http = require('http');
const { SerialPort } = require('serialport');
const path = require('path');

// Configuration
const PORT = 3000;
const DISPLAY_TYPE = 'VFD';

class SimpleDisplayService {
  constructor() {
    this.port = null;
    this.isConnected = false;
    this.comPort = null;
    
    console.log('🔌 Starting Simple Display Service...');
    console.log('Looking for customer display...');
    
    this.findAndConnect();
    this.startServer();
  }

  async findAndConnect() {
    try {
      const ports = await SerialPort.list();
      console.log('Available COM ports:', ports.map(p => p.path).join(', '));
      
      // Try COM1 and COM2 first (user confirmed these are available)
      const userPorts = ['COM1', 'COM2'];
      
      for (const portPath of userPorts) {
        if (ports.some(p => p.path === portPath)) {
          console.log(`Trying ${portPath}...`);
          if (await this.tryConnect(portPath)) {
            this.comPort = portPath;
            console.log(`✅ Connected to display on ${portPath}`);
            this.clearDisplay();
            this.showText('READY');
            return;
          }
        }
      }
      
      // If COM1/COM2 fail, try other common ports
      const commonPorts = ['COM3', 'COM4', 'COM5', 'COM6'];
      
      for (const portPath of commonPorts) {
        if (ports.some(p => p.path === portPath)) {
          console.log(`Trying ${portPath}...`);
          if (await this.tryConnect(portPath)) {
            this.comPort = portPath;
            console.log(`✅ Connected to display on ${portPath}`);
            this.clearDisplay();
            this.showText('READY');
            return;
          }
        }
      }
      
      // If no common port works, try first available
      if (ports.length > 0) {
        const firstPort = ports[0].path;
        console.log(`Trying first available port: ${firstPort}`);
        if (await this.tryConnect(firstPort)) {
          this.comPort = firstPort;
          console.log(`✅ Connected to display on ${firstPort}`);
          this.clearDisplay();
          this.showText('READY');
          return;
        }
      }
      
      console.log('❌ Could not connect to display');
      console.log('Please check:');
      console.log('1. Display is powered on');
      console.log('2. USB cable is connected');
      console.log('3. Correct COM port in Device Manager');
      
    } catch (error) {
      console.error('Error finding display:', error.message);
    }
  }

  async tryConnect(portPath) {
    return new Promise((resolve) => {
      try {
        this.port = new SerialPort({
          path: portPath,
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          autoOpen: false
        });

        this.port.open((err) => {
          if (err) {
            console.log(`❌ ${portPath} failed: ${err.message}`);
            resolve(false);
            return;
          }
          
          this.isConnected = true;
          
          this.port.on('error', (err) => {
            console.error('Serial port error:', err.message);
            this.isConnected = false;
          });
          
          resolve(true);
        });

        // Timeout after 2 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            try {
              this.port.close();
            } catch (e) {}
            resolve(false);
          }
        }, 2000);
        
      } catch (error) {
        resolve(false);
      }
    });
  }

  sendCommand(command) {
    if (!this.isConnected || !this.port) {
      console.log(`[SIMULATION] Would send: ${command}`);
      return;
    }

    try {
      const buffer = Buffer.from(command);
      this.port.write(buffer, (err) => {
        if (err) {
          console.error('Write error:', err.message);
        }
      });
    } catch (error) {
      console.error('Command error:', error.message);
    }
  }

  clearDisplay() {
    // VFD clear command
    this.sendCommand([0x0C]);
  }

  showText(text) {
    if (!text) return;
    
    // Pad to 20 characters (typical VFD width)
    const paddedText = text.toString().substring(0, 20).padEnd(20, ' ');
    
    // VFD display command
    this.sendCommand(paddedText);
    console.log(`📺 Display: "${paddedText.trim()}"`);
  }

  showTotal(amount) {
    const text = `TOTAL: ${parseFloat(amount).toFixed(2)}`;
    this.showText(text);
  }

  showItem(name, price) {
    const text = `${name}: ${parseFloat(price).toFixed(2)}`;
    this.showText(text);
    
    // Show item for 3 seconds, then return to total
    setTimeout(() => {
      // Could show previous total here
    }, 3000);
  }

  startServer() {
    const server = http.createServer((req, res) => {
      // Enable CORS for browser requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url === '/' && req.method === 'GET') {
        // Status check
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          connected: this.isConnected,
          port: this.comPort,
          displayType: DISPLAY_TYPE,
          message: this.isConnected ? 'Display connected' : 'Display not connected'
        }));
        return;
      }

      if (req.url === '/display' && req.method === 'POST') {
        let body = '';
        
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            console.log('Received:', data);

            if (data.action === 'clear') {
              this.clearDisplay();
            } else if (data.action === 'item' && data.itemName) {
              this.showItem(data.itemName, data.price / 100);
            } else if (data.total !== undefined) {
              this.showTotal(data.total / 100);
            }

            res.writeHead(200);
            res.end(JSON.stringify({ success: true, message: 'Updated' }));
          } catch (error) {
            res.writeHead(400);
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ success: false, error: 'Not found' }));
    });

    server.listen(PORT, () => {
      console.log('');
      console.log('🚀 Display server running!');
      console.log(`📍 Local URL: http://localhost:${PORT}`);
      console.log('');
      console.log('To test, open browser and visit:');
      console.log(`http://localhost:${PORT}`);
      console.log('');
      console.log('Your POS can now send data to:');
      console.log(`http://localhost:${PORT}/display`);
      console.log('');
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.log('Another instance may be running');
      } else {
        console.error('Server error:', err.message);
      }
    });
  }
}

// Start the service
new SimpleDisplayService();

// Keep process alive
process.stdin.resume();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});
