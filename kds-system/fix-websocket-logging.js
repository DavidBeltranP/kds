const fs = require('fs');
const path = './backend/src/services/websocket.service.ts';

let content = fs.readFileSync(path, 'utf8');

// Add INFO logging before getting config
const oldPattern = /async broadcastConfigUpdate\(screenId: string\): Promise<void> \{\s+if \(!this\.io\) return;\s+const config/;
const newCode = `async broadcastConfigUpdate(screenId: string): Promise<void> {
    if (!this.io) return;

    wsLogger.info(\`[WEBSOCKET] Broadcasting config update to screen \${screenId}\`);
    const config`;

if (oldPattern.test(content)) {
  content = content.replace(oldPattern, newCode);
  fs.writeFileSync(path, content);
  console.log('SUCCESS: WebSocket service updated with INFO logging');
} else {
  console.log('Pattern not found - checking current content...');
  const snippet = content.substring(content.indexOf('broadcastConfigUpdate'), content.indexOf('broadcastConfigUpdate') + 300);
  console.log('Current content around broadcastConfigUpdate:');
  console.log(snippet);
}
