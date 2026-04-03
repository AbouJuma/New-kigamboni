# LARAVEL POS DISPLAY BRIDGE - SERVER SETUP

## 🎯 Your Setup
- **POS System**: Stocky (Laravel) hosted on Asura
- **Customer Display**: Local VFD display (COM port)
- **Connection**: PHP Bridge on server + Node.js service on POS machine

## 🚀 Step-by-Step Setup

### **STEP 1: Add Controller to Laravel**

1. Copy `DisplayBridgeController.php` to:
   ```
   app/Http/Controllers/DisplayBridgeController.php
   ```

2. Copy the routes from `laravel-routes.php` and add to:
   ```
   routes/web.php
   ```

### **STEP 2: Create Storage Directory**

Run these commands on your server (via SSH or DirectAdmin Terminal):

```bash
# Navigate to your Laravel app
cd /home/ecofield/domains/client.ecofieldgroup.com/public_html/delight

# Create storage directory
mkdir -p storage/app

# Set permissions
chmod 755 storage/app
chmod 775 storage/logs

# Clear Laravel cache (if needed)
php artisan cache:clear
php artisan route:clear
```

### **STEP 3: Test the Endpoint**

After uploading files, test these URLs:

```
https://client.ecofieldgroup.com/delight/pos-display-bridge
https://client.ecofieldgroup.com/delight/pos-display-bridge/status
```

**Expected output:**
```json
{
  "success": true,
  "data": [],
  "server_info": {
    "php_version": "8.x.x",
    "server_time": "2026-04-03 12:00:00",
    "laravel_version": "9.x.x",
    "file_exists": false,
    "file_writable": true
  }
}
```

### **STEP 4: Test POST Request**

Send a test POST request:

```bash
curl -X POST https://client.ecofieldgroup.com/delight/pos-display-bridge/display \
  -H "Content-Type: application/json" \
  -d '{"total":15000,"action":"total"}'
```

**Expected output:**
```json
{
  "success": true,
  "message": "Display data updated successfully",
  "data": {
    "total": 15000,
    "action": "total",
    "timestamp": 1234567890,
    "server_time": "2026-04-03 12:00:00"
  }
}
```

---

## 🔧 If You Get 404 Error

### **Check 1: Routes Not Loading**

Clear Laravel cache:
```bash
php artisan route:clear
php artisan cache:clear
php artisan config:clear
php artisan view:clear
```

### **Check 2: Wrong URL**

Try these variations:
```
https://client.ecofieldgroup.com/delight/pos-display-bridge
https://client.ecofieldgroup.com/delight/pos-display-bridge/
https://client.ecofieldgroup.com/delight/pos-display-bridge/display
https://client.ecofieldgroup.com/delight/index.php/pos-display-bridge
```

### **Check 3: .htaccess Issue**

Make sure your `.htaccess` allows Laravel routes. Check `public/.htaccess`:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
```

### **Check 4: File Upload**

Verify files uploaded correctly to:
```
app/Http/Controllers/DisplayBridgeController.php
routes/web.php (with new routes)
```

---

## 📋 Local POS Machine Setup

Once the server endpoint works, set up the local service:

### **On Your POS Computer:**

1. Install Node.js: https://nodejs.org/

2. Copy these files to POS machine:
   - `local-bridge-service.js`
   - `local-package.json`
   - Rename `local-package.json` to `package.json`

3. Install dependencies:
   ```bash
   npm install
   ```

4. Edit `local-bridge-service.js` - update the URL:
   ```javascript
   serverUrl: 'https://client.ecofieldgroup.com/delight/pos-display-bridge'
   ```

5. Start the service:
   ```bash
   npm start
   ```

---

## 🔄 How It Works

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────┐
│   POS Browser (Local)   │────▶│   Laravel Server       │────▶│   Display Data   │
│   http://localhost:3000 │     │   /pos-display-bridge  │     │   JSON File      │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────┘
         │                                                             │
         │                                                             │
         │                      ┌─────────────────────────┐            │
         └─────────────────────▶│   Local Node.js Service │◄───────────┘
                                │   (Polls server)         │
                                │   Updates COM Port       │
                                └─────────────────────────┘
                                         │
                                         ▼
                                ┌─────────────────────────┐
                                │   Customer Display      │
                                │   (VFD/COM Port)        │
                                └─────────────────────────┘
```

---

## 🧪 Testing Complete Flow

1. **Server side**: Visit `https://client.ecofieldgroup.com/delight/pos-display-bridge`
   - Should show JSON response ✅

2. **Send test data**:
   ```bash
   curl -X POST https://client.ecofieldgroup.com/delight/pos-display-bridge/display \
     -H "Content-Type: application/json" \
     -d '{"total":15000,"action":"total"}'
   ```
   - Should return success ✅

3. **Check data file**:
   - File created at: `storage/app/display_data.json`

4. **Local service**: Start `local-bridge-service.js`
   - Should poll server and update display ✅

---

## ❌ Troubleshooting

### "404 Not Found"
- Routes not added to web.php
- Laravel cache needs clearing
- Wrong URL path

### "500 Server Error"
- Check Laravel logs: `storage/logs/laravel.log`
- File permissions issue
- Missing controller

### "File not writable"
- Run: `chmod -R 775 storage/`
- Check ownership: `chown -R ecofield:ecofield storage/`

### "CORS Error" in browser
- Already handled in controller
- Check if headers are sent

---

## ✅ Success Checklist

- [ ] Controller uploaded to `app/Http/Controllers/`
- [ ] Routes added to `routes/web.php`
- [ ] Endpoint returns JSON (visit URL in browser)
- [ ] POST request works (use curl or Postman)
- [ ] Local service connects and polls
- [ ] Display shows updates

---

## 📞 Quick Commands

```bash
# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Check routes
php artisan route:list | grep display

# Check logs
tail -f storage/logs/laravel.log

# Test endpoint
curl https://client.ecofieldgroup.com/delight/pos-display-bridge
```

---

**Ready to start? Upload the files and test the URL!**
