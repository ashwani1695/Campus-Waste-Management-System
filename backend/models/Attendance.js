const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  cleaner: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
  date: Date,
  checkIn: Date,
  checkOut: Date,
  remarks: String,
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;
