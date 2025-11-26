const fs = require('fs');
const path = './backend/src/services/websocket.service.ts';

let content = fs.readFileSync(path, 'utf8');

// Add logging to the Redis message handler
const oldHandler = `redisSub.on('message', async (channel, message) => {
      const data = JSON.parse(message);`;

const newHandler = `redisSub.on('message', async (channel, message) => {
      wsLogger.info(\`[REDIS] Received message on channel: \${channel}\`);
      const data = JSON.parse(message);
      wsLogger.info(\`[REDIS] Message data: \${JSON.stringify(data)}\`);`;

if (content.includes(oldHandler)) {
  content = content.replace(oldHandler, newHandler);
  fs.writeFileSync(path, content);
  console.log('SUCCESS: Added Redis message logging');
} else {
  console.log('Pattern not found - checking...');
  const snippet = content.substring(
    content.indexOf("redisSub.on('message'"),
    content.indexOf("redisSub.on('message'") + 200
  );
  console.log('Current:', snippet);
}
