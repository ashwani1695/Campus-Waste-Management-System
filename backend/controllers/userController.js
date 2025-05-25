const Report = require('../models/Report');

// Controller to handle report submission
const submitReport = async (req, res) => {
  try {
    const { title, location, description } = req.body;
    const imageUrl = req.file ? req.file.path : null;

    const newReport = new Report({
      title,
      location,
      description,
      imageUrl,
      user: req.user._id,
    });

    await newReport.save();

    res.status(201).json({ message: 'Report submitted successfully.' });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  submitReport,
  getMyReports
};