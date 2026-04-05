const pendingActions = new Map();

function setPendingAction(userId, action) {
  pendingActions.set(userId, action);
}

function getPendingAction(userId) {
  return pendingActions.get(userId);
}

function clearPendingAction(userId) {
  pendingActions.delete(userId);
}

module.exports = {
  setPendingAction,
  getPendingAction,
  clearPendingAction,
};
