# PHP + Local Node.js Display Bridge Solution

**Perfect for shared hosting environments where Node.js is not installed on the web server!**

## 🎯 **How It Works**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Server   │    │   Local POS      │    │ Customer       │
│ (PHP + Laravel) │◄──►│ Machine         │◄──►│ Display         │
│                 │    │ (Node.js)       │    │ (VFD/ESC-POS) │
│ • POS Website   │    │ • Reads PHP     │    │ • Shows Totals  │
│ • PHP Bridge    │    │ • Hardware Comm  │    │ • Shows Items   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

1. **POS Website** → Sends display requests to PHP bridge
2. **PHP Bridge** → Saves requests to JSON file on server
3. **Local Service** → Polls PHP server, reads JSON file
4. **Customer Display** → Shows formatted totals/items

## 📁 **Files Overview**

### **On Web Server (Your Hosting)**
- `display-bridge.php` - PHP API endpoint
- `display_data.json` - Data storage (auto-created)
- `display.log` - Request log (auto-created)

### **On Local POS Machine**
- `local-bridge-service.js` - Local Node.js service
- `local-package.json` - Dependencies for local service
- `setup-local.bat` - Installation script
- `install-local-service.js` - Windows service installer

## 🚀 **Setup Instructions**

### **Step 1: Deploy PHP Bridge (Web Server)**
1. Upload all files to your hosting
2. Ensure `pos-display-bridge/` folder is writable
3. Test PHP endpoint: `https://yourdomain.com/delight/pos-display-bridge/display-bridge.php`

### **Step 2: Install Local Service (POS Machine)**
1. **Copy the POS display bridge folder to your POS machine**
2. Run `setup-local.bat` as Administrator
3. Service will auto-start with Windows

### **Step 3: Update POS Frontend**
Replace the customer display import in your POS:
```javascript
// OLD (for local Node.js service)
import { CustomerDisplayMixin } from "@/utils/customer-display.js";

// NEW (for PHP bridge)
import { CustomerDisplayMixin } from "@/utils/update-frontend.js";
```

## 🔧 **Configuration**

### **PHP Bridge Settings**
Edit `display-bridge.php` if needed:
```php
// Change file paths (if not in same directory)
$displayFile = __DIR__ . '/display_data.json';
$logFile = __DIR__ . '/display.log';
```

### **Local Service Settings**
Edit `local-bridge-service.js`:
```javascript
const config = {
    serverUrl: 'https://client.ecofieldgroup.com/delight/pos-display-bridge/display-bridge.php',
    pollInterval: 1000, // Check every 1 second
};
```

## 📡 **API Endpoints**

### **PHP Bridge (Server)**
```javascript
// Send total to display
POST /display-bridge.php
{
  "total": 15000,
  "action": "total"
}

// Show item briefly
POST /display-bridge.php  
{
  "itemName": "Coffee",
  "price": 5000,
  "action": "item"
}

// Clear display
POST /display-bridge.php
{
  "action": "clear"
}

// Check status
GET /display-bridge.php
```

## 🧪 **Testing**

### **Test PHP Bridge**
```bash
# Test the PHP endpoint directly
curl -X POST https://yourdomain.com/delight/pos-display-bridge/display-bridge.php \
  -H "Content-Type: application/json" \
  -d '{"total":15000,"action":"total"}'
```

### **Test Local Service**
```bash
# On POS machine
cd pos-display-bridge
npm install --production
npm start
```

### **Test Complete Flow**
1. Add item to POS cart
2. Check PHP log file: `display.log`
3. Check local service log: `bridge.log`
4. Verify customer display shows data

## 🔄 **How Data Flows**

### **Adding Item to Cart**
1. POS frontend → POST to PHP bridge
2. PHP bridge → Saves to `display_data.json`
3. Local service → Polls PHP, reads JSON
4. Local service → Sends to customer display
5. Customer display → Shows item for 3 seconds, then total

### **Cart Total Changes**
1. POS frontend → POST new total to PHP
2. PHP bridge → Updates JSON file
3. Local service → Detects change, updates display

## 🛠️ **Troubleshooting**

### **PHP Bridge Issues**
- **404 Error**: Check file path in URL
- **403 Error**: Check folder permissions
- **500 Error**: Check PHP error logs
- **No data written**: Check folder write permissions

### **Local Service Issues**
- **"Port not found"**: Check COM port connections
- **"Connection timeout"**: Check server URL and internet
- **"Service won't start"**: Run as Administrator

### **Display Issues**
- **No display**: Check COM port, power, connections
- **Garbled text**: Check display type settings
- **No updates**: Check polling interval and server URL

## 📊 **Monitoring**

### **Log Files**
- **Server**: `display.log` - All display requests
- **Local**: `bridge.log` - Service activity and errors

### **Status Checking**
```javascript
// Check PHP bridge status
fetch('https://yourdomain.com/delight/pos-display-bridge/display-bridge.php')
  .then(r => r.json())
  .then(data => console.log('Server status:', data));
```

## ✅ **Advantages of This Solution**

1. **Works on shared hosting** - No Node.js required on server
2. **Reliable** - File-based storage with locking
3. **Real-time** - 1-second polling for instant updates
4. **Fault-tolerant** - Graceful error handling and reconnection
5. **Easy setup** - Simple installation scripts
6. **Auto-start** - Windows service for production use

## 🎉 **You're Ready!**

Your POS customer display will now work perfectly with your shared hosting environment:

✅ **No Node.js needed on web server**  
✅ **Works with your existing DirectAdmin hosting**  
✅ **Real-time display updates**  
✅ **Auto-start service on POS machine**  
✅ **Complete error handling and logging**  
✅ **Easy installation and maintenance**  

The hybrid PHP + Local Node.js solution gives you the best of both worlds!
