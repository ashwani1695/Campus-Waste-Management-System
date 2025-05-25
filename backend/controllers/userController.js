const Report = require('../models/Report');

// Controller to handle report submission
const submitReport = async (req, res) => {
  try {
    const { title, location, description } = req.body;
    // Ensure file path from multer is correctly handled
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null; // Relative path for serving

    if (!title || !location || !description) {
        return res.status(400).json({ message: 'Title, location, and description are required.' });
    }

    const newReport = new Report({
      title,
      location,
      description,
      imageUrl,
      reportedBy: req.user._id, // Changed from 'user' to 'reportedBy'
      status: 'pending' // Explicitly set initial status
    });

    await newReport.save();

    res.status(201).json({ message: 'Report submitted successfully.', report: newReport });
  } catch (error) {
    console.error('Error submitting report:', error);
    // Provide more specific error messages if possible
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    res.status(500).json({ message: 'Internal server error submitting report.' });
  }
};

const getMyReports = async (req, res) => {
  try {
    // Find reports where the 'reportedBy' field matches the logged-in user's ID
    const reports = await Report.find({ reportedBy: req.user._id }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error('Error fetching user reports:', err);
    res.status(500).json({ message: 'Server error fetching reports', error: err.message });
  }
};

module.exports = {
  submitReport,
  getMyReports
};