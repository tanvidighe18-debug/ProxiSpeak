const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const avatars = new Map();

app.get('/', (req, res) => {
  res.send('ProxiSpeak WebSocket Server is running!');
});

wss.on('connection', (ws) => {
  const avatarId =
    Date.now().toString() +
    Math.random().toString(36).slice(2, 7);

  avatars.set(avatarId, { x: 100, y: 100 });

  console.log('Avatar connected:', avatarId);

  ws.send(JSON.stringify({
    type: 'init',
    id: avatarId,
    avatars: Object.fromEntries(avatars)
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (
        data.type === 'move' &&
        Number.isFinite(data.x) &&
        Number.isFinite(data.y)
      ) {
        avatars.set(avatarId, {
          x: data.x,
          y: data.y
        });

        const update = JSON.stringify({
          type: 'movement',
          id: avatarId,
          x: data.x,
          y: data.y
        });

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(update);
          }
        });
      }
    } catch (error) {
      console.error('Invalid message received:', error.message);
    }
  });

  ws.on('close', () => {
    avatars.delete(avatarId);

    const update = JSON.stringify({
      type: 'leave',
      id: avatarId
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(update);
      }
    });

    console.log('Avatar disconnected:', avatarId);
  });
});

const PORT = 3001;

server.listen(PORT, () => {
  console.log('ProxiSpeak server running at http://localhost:' + PORT);
});