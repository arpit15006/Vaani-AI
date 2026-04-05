const connectedClients = new Map();

function addClient(userId, res) {
  // If user already connected elsewhere, close previous to prevent double-streams
  if (connectedClients.has(userId)) {
    const oldRes = connectedClients.get(userId);
    oldRes.end();
  }
  
  connectedClients.set(userId, res);
  // Send initial connected ping
  sendNotification(userId, { type: "connected", message: "SSE connected" });
  console.log(`[SSE] User ${userId} connected to event stream`);
}

function removeClient(userId) {
  connectedClients.delete(userId);
  console.log(`[SSE] User ${userId} disconnected from event stream`);
}

function sendNotification(userId, payload) {
  const res = connectedClients.get(userId);
  if (res) {
    // SSE Format: data: { ... }\n\n
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}

module.exports = {
  addClient,
  removeClient,
  sendNotification,
};
