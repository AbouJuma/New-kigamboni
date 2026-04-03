/**
 * Quick test for display - run this to verify connection
 */

const { SerialPort } = require('serialport');

console.log('Testing customer display connection...\n');

async function testDisplay() {
  try {
    const ports = await SerialPort.list();
    console.log('Available COM ports:', ports.map(p => `${p.path} (${p.manufacturer || 'unknown'})`).join('\n'));
    console.log('');
    
    // Try each port
    for (const portInfo of ports) {
      console.log(`Testing ${portInfo.path}...`);
      
      try {
        const port = new SerialPort({
          path: portInfo.path,
          baudRate: 9600,
          autoOpen: false
        });

        await new Promise((resolve) => {
          port.open((err) => {
            if (!err) {
              console.log(`  ✅ ${portInfo.path} opened successfully!`);
              
              // Try to send test data
              port.write('\x0C', (err) => { // Clear command
                if (!err) {
                  console.log(`  ✅ Can write to ${portInfo.path}`);
                  
                  // Show test message
                  setTimeout(() => {
                    port.write('TEST OK', (err) => {
                      if (!err) {
                        console.log(`  ✅ Display test message sent to ${portInfo.path}`);
                      }
                      port.close();
                      resolve(true);
                    });
                  }, 500);
                } else {
                  port.close();
                  resolve(false);
                }
              });
            } else {
              console.log(`  ❌ ${portInfo.path}: ${err.message}`);
              resolve(false);
            }
          });
          
          setTimeout(() => {
            try { port.close(); } catch(e) {}
            resolve(false);
          }, 3000);
        });
        
      } catch (err) {
        console.log(`  ❌ ${portInfo.path} error: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\nTest complete.');
  process.exit(0);
}

testDisplay();
