    const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    message: { type: String, required: true },
    shopId:{type: mongoose.Types.ObjectId, ref: "shop"},
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("messages", messageSchema);
