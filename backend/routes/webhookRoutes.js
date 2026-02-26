const express = require('express');
const router = express.Router();
const {
  registerWebhook,
  listWebhooks,
  deleteWebhook,
  ingestWebhook,
  getEvents,
  sendWebhook
} = require('../controllers/webhookController');

// Outgoing / tool endpoint
router.post('/send', sendWebhook);

// Registry management
router.post('/register', registerWebhook);
router.get('/list', listWebhooks);
router.delete('/:webhookId', deleteWebhook);

// Ingest (receive incoming webhooks)
router.post('/ingest/:webhookId', ingestWebhook);

// Event log
router.get('/events', getEvents);

module.exports = router;
