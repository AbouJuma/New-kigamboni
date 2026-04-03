const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'POSDisplayLocalBridge',
  description: 'Local POS Display Bridge - communicates with PHP backend',
  script: path.join(__dirname, 'local-bridge-service.js'),
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
  console.log('Local service installed successfully');
  svc.start();
});

// Listen for the 'start' event
svc.on('start', () => {
  console.log('Local service started successfully');
  console.log('The POS Display Local Bridge service is now running');
  console.log('It will communicate with your PHP server and update the customer display');
});

// Install the service
svc.install();
