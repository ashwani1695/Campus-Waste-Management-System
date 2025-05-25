const mongoose = require("mongoose");

const taskAssignmentSchema = new mongoose.Schema({
  report: ObjectId (Report),
  cleaner: ObjectId (Cleaner),
  assignedBy: ObjectId (Admin),
  status: { type: String, enum: ['assigned', 'in-progress', 'completed'], default: 'assigned' },
  assignedAt: Date,
  updatedAt: Date,
});

const TaskAssignment = mongoose.model("TaskAssignment", taskAssignmentSchema);
module.exports = TaskAssignment;