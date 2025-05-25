const mongoose = require("mongoose");

const cleanerIssueSchema = new mongoose.Schema({
  cleaner: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
  subject: String,
  message: String,
  createdAt: Date,
  status: { type: String, enum: ["pending", "resolved"], default: "pending" },
});

const CleanerIssue = mongoose.model("CleanerIssue", cleanerIssueSchema);
module.exports = CleanerIssue;