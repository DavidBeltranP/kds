const fs = require('fs');
const path = './backend/src/controllers/screen.controller.ts';

let content = fs.readFileSync(path, 'utf8');

// Add import for websocketService
if (!content.includes("import { websocketService }")) {
  content = content.replace(
    "import { asyncHandler, AppError } from '../middlewares/error.middleware';",
    "import { asyncHandler, AppError } from '../middlewares/error.middleware';\nimport { websocketService } from '../services/websocket.service';"
  );
}

// Add direct broadcast call after invalidateConfigCache for updateAppearance
const oldInvalidate = `// Invalidar cache
    await screenService.invalidateConfigCache(id);

    res.json({ message: 'Appearance updated' });`;

const newInvalidate = `// Invalidar cache y notificar al frontend
    await screenService.invalidateConfigCache(id);

    // Broadcast directo al WebSocket (bypass Redis PubSub)
    await websocketService.broadcastConfigUpdate(id);

    res.json({ message: 'Appearance updated' });`;

if (content.includes(oldInvalidate)) {
  content = content.replace(oldInvalidate, newInvalidate);
  fs.writeFileSync(path, content);
  console.log('SUCCESS: Added direct WebSocket broadcast to updateAppearance controller');
} else {
  console.log('Pattern not found. Looking for similar...');
  const match = content.match(/\/\/ Invalidar cache[\s\S]{0,200}/);
  if (match) {
    console.log('Found:', match[0]);
  }
}
