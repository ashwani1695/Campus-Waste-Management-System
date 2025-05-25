const mongoose =require("mongoose");

const cleanerIssueSchema = new mongoose.Schema({
  cleaner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // User with role 'cleaner'
    required: true
  },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "resolved"],
    default: "pending"
  },
  // createdAt: Date, // Removed, timestamps: true will handle this
}, { timestamps: true }); // Adds createdAt and updatedAt

const CleanerIssue = mongoose.model("CleanerIssue", cleanerIssueSchema);
module.exports = CleanerIssue;