const Report = require('../models/Report');

const submitReport = async (req, res) => {
  try {
    const { title, description, imageUrl } = req.body;
    const report = new Report({ title, description, imageUrl, reportedBy: req.user._id });
    await report.save();
    res.status(201).json({ message: 'Report submitted', report });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reportedBy: req.user._id });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  submitReport,
  getMyReports
};
