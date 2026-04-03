# POS Display Bridge

A local bridge service that connects your web-based POS system with an embedded customer display (VFD/OPOS).

## Features

- **Auto-detects COM ports** for customer displays
- **Supports multiple protocols**: VFD and ESC/POS
- **Real-time updates** for cart totals and item prices
- **RESTful API** for easy integration
- **Windows service support** for auto-start on boot
- **Simulation mode** when no display is connected

## Quick Start

1. **Install dependencies:**
   ```bash
   cd pos-display-bridge
   npm install
   ```

2. **Start the service:**
   ```bash
   npm start
   ```
   
   Or for development:
   ```bash
   npm run dev
   ```

3. **Install as Windows service (auto-start on boot):**
   ```bash
   npm run install-service
   ```

## API Endpoints

### POST /display
Send display updates to the customer display.

**Request body:**
```json
{
  "total": 15000,
  "action": "total",
  "itemName": "Product Name",
  "price": 5000,
  "displayType": "VFD"
}
```

**Actions:**
- `"total"` - Display total amount (default)
- `"clear"` - Clear the display
- `"item"` - Show item name and price briefly

### POST /connect
Manually connect to a specific COM port.

**Request body:**
```json
{
  "portPath": "COM3",
  "displayType": "VFD"
}
```

### GET /ports
List available COM ports.

### GET /
Check service status and connection info.

## Integration with POS Frontend

Add this JavaScript to your POS frontend:

```javascript
class POSDisplayBridge {
  constructor() {
    this.apiBase = 'http://localhost:3000';
  }

  async sendTotal(total) {
    try {
      const response = await fetch(`${this.apiBase}/display`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total, action: 'total' })
      });
      return await response.json();
    } catch (error) {
      console.error('Display error:', error);
    }
  }

  async showItem(name, price) {
    try {
      const response = await fetch(`${this.apiBase}/display`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName: name, price, action: 'item' })
      });
      return await response.json();
    } catch (error) {
      console.error('Display error:', error);
    }
  }

  async clearDisplay() {
    try {
      const response = await fetch(`${this.apiBase}/display`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      });
      return await response.json();
    } catch (error) {
      console.error('Display error:', error);
    }
  }
}

// Usage example:
const display = new POSDisplayBridge();

// When cart total changes
display.sendTotal(15000);

// When item is added
display.showItem('Coffee', 5000);

// When cart is cleared
display.clearDisplay();
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
PORT=3000
DISPLAY_TYPE=VFD
COM_PORT=auto
LOG_LEVEL=info
```

## Display Types

### VFD (Vacuum Fluorescent Display)
- Default for most customer displays
- 40-character display
- Clear, bright text

### ESC/POS
- For ESC/POS compatible displays
- Supports line-by-line output
- Common in receipt printers with displays

## Troubleshooting

### Display not found
1. Check available ports: `GET http://localhost:3000/ports`
2. Manually specify COM port in `.env`: `COM_PORT=COM3`
3. Ensure display drivers are installed

### Service won't start
1. Run as Administrator for Windows service installation
2. Check if port 3000 is already in use
3. Review logs in Windows Event Viewer

### No display updates
1. Verify bridge service is running
2. Check CORS settings if accessing from different domains
3. Test with simulation mode (no display connected)

## Windows Service Management

**Install service:**
```bash
npm run install-service
```

**Uninstall service:**
```bash
npm run uninstall-service
```

**Check service status:**
- Open Windows Services (services.msc)
- Look for "POSDisplayBridge"
- Status should be "Running"

## Development

**Install development dependencies:**
```bash
npm install
```

**Run with auto-reload:**
```bash
npm run dev
```

**Test endpoints:**
```bash
# Test total display
curl -X POST http://localhost:3000/display -H "Content-Type: application/json" -d "{\"total\":15000}"

# Test item display
curl -X POST http://localhost:3000/display -H "Content-Type: application/json" -d "{\"itemName\":\"Coffee\",\"price\":5000,\"action\":\"item\"}"

# Clear display
curl -X POST http://localhost:3000/display -H "Content-Type: application/json" -d "{\"action\":\"clear\"}"
```
