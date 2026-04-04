const express = require("express");
const router = express.Router();
const { chatLimiter } = require("../middleware/rateLimit");
const { authenticateUser } = require("../middleware/authenticateUser");
const { validateChatInput } = require("../middleware/inputValidator");
const { handleChat } = require("../controllers/chatController");

router.post("/", chatLimiter, authenticateUser, validateChatInput, handleChat);

module.exports = router;
