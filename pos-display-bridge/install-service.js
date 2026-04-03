const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'POSDisplayBridge',
  description: 'Bridge service for POS to customer display communication',
  script: path.join(__dirname, 'server.js'),
  nodeOptions: [
    '--max-old-space-size=4096'
  ],
  env: [{
    name: 'NODE_ENV',
    value: 'production'
  }]
});

// Listen for the 'install' event
svc.on('install', () => {
  console.log('Service installed successfully');
  svc.start();
});

// Listen for the 'start' event
svc.on('start', () => {
  console.log('Service started successfully');
  console.log('The POS Display Bridge service is now running and will start automatically with Windows');
});

// Install the service
svc.install();
