const fs = require('fs');
let index = fs.readFileSync('hostinger_deploy/index.php', 'utf8');

const targetStr = `} else if (tabId === 'apks') {`;
const replaceStr = `} else if (tabId === 'drivers') {
                fetchDriversList();
            } else if (tabId === 'apks') {`;

index = index.replace(targetStr, replaceStr);

// Also add a call on load
const initStr = `setInterval(fetchTelemetry, 2000);`;
const replaceInitStr = `setInterval(fetchTelemetry, 2000);
            fetchDriversList();`;
index = index.replace(initStr, replaceInitStr);

fs.writeFileSync('hostinger_deploy/index.php', index);
