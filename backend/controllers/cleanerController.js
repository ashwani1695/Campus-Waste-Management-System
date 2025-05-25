const Report = require('../models/Report');
const Attendance = require('../models/Attendance');
const CleanerIssue = require('../models/CleanerIssue');

const getAssignedReports = async (req, res) => {
  try {
    const reports = await Report.find({ assignedTo: req.user._id });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { reportId, status } = req.body;
    const report = await Report.findById(reportId);
    if (!report || String(report.assignedTo) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Report not found or unauthorized' });
    }
    report.status = status;
    await report.save();
    res.json({ message: 'Task status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const checkInAttendance = async (req, res) => {
  try {
    const existing = await Attendance.findOne({ cleaner: req.user._id, date: new Date().toISOString().slice(0, 10) });
    if (existing) return res.status(400).json({ message: 'Already checked in today' });
    const record = new Attendance({ cleaner: req.user._id, date: new Date(), checkIn: new Date() });
    await record.save();
    res.status(201).json({ message: 'Checked in', record });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const checkOutAttendance = async (req, res) => {
  try {
    const record = await Attendance.findOne({ cleaner: req.user._id, date: new Date().toISOString().slice(0, 10) });
    if (!record || record.checkOut) return res.status(400).json({ message: 'Already checked out or not checked in yet' });
    record.checkOut = new Date();
    await record.save();
    res.json({ message: 'Checked out', record });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const submitCleanerIssue = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const issue = new CleanerIssue({ cleaner: req.user._id, subject, message });
    await issue.save();
    res.status(201).json({ message: 'Issue reported', issue });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ cleaner: req.user._id });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  getAssignedReports,
  updateTaskStatus,
  checkInAttendance,
  checkOutAttendance,
  submitCleanerIssue,
  getMyAttendance
};
