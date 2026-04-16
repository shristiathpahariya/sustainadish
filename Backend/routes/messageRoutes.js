const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');

router.post('/messages', MessageController.createMessage);

module.exports = router;