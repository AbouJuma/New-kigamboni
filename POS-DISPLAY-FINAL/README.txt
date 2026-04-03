# POS Display Bridge - Setup Guide

## Quick Start

1. **Install dependencies:**
   ```
   npm install
   ```

2. **Run the service:**
   ```
   node bridge.js
   ```

3. **Display should show:** `READY`

## Configuration

- Server URL: `https://client.ecofieldgroup.com/delight/display-bridge.php`
- Poll interval: 5 seconds
- COM ports: Auto-detects COM1 and COM2

## Testing

1. Visit: https://client.ecofieldgroup.com/delight/display-bridge.php
2. Should return: `{"success":true,"data":[],"server_time":"..."}`

## Troubleshooting

- **Display not showing:** Check COM ports in Device Manager
- **Server errors:** Check `bridge.log` file
- **403 errors:** Verify URL ends with `.php`
