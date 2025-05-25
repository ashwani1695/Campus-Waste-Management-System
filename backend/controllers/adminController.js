const User = require('../models/User');
const Report = require('../models/Report');
const Attendance = require('../models/Attendance');
const CleanerIssue = require('../models/CleanerIssue');
const bcrypt = require('bcryptjs');

const createCleaner = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newCleaner = new User({ name, email, password: hashedPassword, role: 'cleaner' });
    await newCleaner.save();
    res.status(201).json({ message: 'Cleaner created', cleaner: newCleaner });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const assignReportToCleaner = async (req, res) => {
  try {
    const { reportId, cleanerId } = req.body;
    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    report.assignedTo = cleanerId;
    report.status = 'assigned';
    await report.save();
    res.json({ message: 'Report assigned to cleaner' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const viewAllReports = async (req, res) => {
  try {
    const reports = await Report.find().populate('reportedBy assignedTo');
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateReportStatus = async (req, res) => {
  try {
    const { reportId, status } = req.body;
    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    report.status = status;
    await report.save();
    res.json({ message: 'Report status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteCompletedReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.status !== 'completed') return res.status(400).json({ message: 'Only completed reports can be deleted' });
    await report.deleteOne();
    res.json({ message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const viewAttendance = async (req, res) => {
  try {
    const records = await Attendance.find().populate('cleaner');
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const viewCleanerIssues = async (req, res) => {
  try {
    const issues = await CleanerIssue.find().populate('cleaner');
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const resolveCleanerIssue = async (req, res) => {
  try {
    const issue = await CleanerIssue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    issue.status = 'resolved';
    await issue.save();
    res.json({ message: 'Issue resolved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  createCleaner,
  assignReportToCleaner,
  viewAllReports,
  updateReportStatus,
  deleteCompletedReport,
  viewAttendance,
  viewCleanerIssues,
  resolveCleanerIssue
};
