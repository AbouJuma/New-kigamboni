const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'POSDisplayBridge',
  script: path.join(__dirname, 'server.js')
});

// Listen for the 'uninstall' event
svc.on('uninstall', () => {
  console.log('Service uninstalled successfully');
  console.log('The POS Display Bridge service has been removed from Windows services');
});

// Uninstall the service
svc.uninstall();
