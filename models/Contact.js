const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    default: "Inconnu",
  },
  lastMessage: {
    type: String,
    default: "",
  },
  lastChoice: {
    type: String,
    default: "",
  },
  messageCount: {
    type: Number,
    default: 1,
  },
  firstContact: {
    type: Date,
    default: Date.now,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Contact", ContactSchema);