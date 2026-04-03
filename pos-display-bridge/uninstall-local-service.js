const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'POSDisplayLocalBridge',
  script: path.join(__dirname, 'local-bridge-service.js')
});

// Listen for the 'uninstall' event
svc.on('uninstall', () => {
  console.log('Local service uninstalled successfully');
  console.log('The POS Display Local Bridge service has been removed from Windows services');
});

// Uninstall the service
svc.uninstall();
