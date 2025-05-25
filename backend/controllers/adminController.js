const User = require('../models/User');
const Report = require('../models/Report');
const Attendance = require('../models/Attendance');
const CleanerIssue = require('../models/CleanerIssue');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit'); // For PDF generation
const fs = require('fs');
const path = require('path');


const createCleaner = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists for another user.' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newCleaner = new User({ name, email, password: hashedPassword, role: 'cleaner' });
    await newCleaner.save();
    // Exclude password from the response
    const cleanerResponse = { ...newCleaner._doc };
    delete cleanerResponse.password;
    res.status(201).json({ message: 'Cleaner created successfully.', cleaner: cleanerResponse });
  } catch (err) {
    console.error("Error creating cleaner:", err)
    res.status(500).json({ message: 'Server error while creating cleaner.', error: err.message });
  }
};

// New: Get all cleaners
const getAllCleaners = async (req, res) => {
  try {
    const cleaners = await User.find({ role: 'cleaner' }).select('-password'); // Exclude passwords
    res.json(cleaners);
  } catch (err) {
    console.error("Error fetching cleaners:", err)
    res.status(500).json({ message: 'Server error fetching cleaners.', error: err.message });
  }
};

const assignReportToCleaner = async (req, res) => {
  try {
    const { reportId } = req.params; // reportId from URL parameter
    const { cleanerId } = req.body; // cleanerId from request body

    if (!cleanerId) {
      return res.status(400).json({ message: 'Cleaner ID is required.' });
    }

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    if (report.status !== 'pending' && report.status !== 'rejected') { // Can re-assign a rejected report
        return res.status(400).json({ message: `Report is already ${report.status} and cannot be assigned.` });
    }

    const cleaner = await User.findById(cleanerId);
    if (!cleaner || cleaner.role !== 'cleaner') {
        return res.status(404).json({ message: 'Cleaner not found or user is not a cleaner.' });
    }

    report.assignedTo = cleanerId;
    report.assignedBy = req.user._id; // Admin assigning the task
    report.status = 'assigned';
    report.assignedAt = new Date();
    report.completedAt = null; // Ensure completedAt is nullified if re-assigning
    
    await report.save();
    res.json({ message: 'Report assigned to cleaner successfully.', report });
  } catch (err) {
    console.error("Error assigning report:", err);
    res.status(500).json({ message: 'Server error assigning report.', error: err.message });
  }
};

const viewAllReports = async (req, res) => {
  try {
    // Populate reportedBy and assignedTo with user details (name and email)
    const reports = await Report.find()
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 }); // Show newest reports first
    res.json(reports);
  } catch (err) {
    console.error("Error viewing all reports:", err);
    res.status(500).json({ message: 'Server error viewing reports.', error: err.message });
  }
};

const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params; // reportId from URL parameter
    const { status } = req.body; // new status from request body

    const validStatuses = ['pending', 'assigned', 'in-progress', 'completed', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid or missing status provided.' });
    }

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    // Logic for status transitions (optional, but good practice)
    // For example, admin might directly mark as 'completed' or 'rejected'
    
    report.status = status;
    if (status === 'completed') {
      report.completedAt = new Date();
    } else if (status === 'pending' || status === 'rejected') {
        // If moving back to pending or rejecting, clear assignment details
        report.assignedTo = null;
        report.assignedBy = null;
        report.assignedAt = null;
        report.completedAt = null; // Also clear completedAt
    }
    
    await report.save();
    res.json({ message: `Report status updated to ${status}.`, report });
  } catch (err) {
    console.error("Error updating report status:", err);
    res.status(500).json({ message: 'Server error updating status.', error: err.message });
  }
};

const deleteCompletedReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    
    // Allow deletion only if completed or rejected to avoid accidental deletion of active tasks.
    if (report.status !== 'completed' && report.status !== 'rejected') {
      return res.status(400).json({ message: 'Only completed or rejected reports can be deleted.' });
    }

    // If there's an image associated, consider deleting it from /uploads
    if (report.imageUrl) {
        const imagePath = path.join(__dirname, '..', report.imageUrl); // Adjust path as necessary
        if (fs.existsSync(imagePath)) {
            fs.unlink(imagePath, (err) => {
                if (err) console.error("Error deleting report image:", err);
            });
        }
    }
    
    await Report.deleteOne({ _id: req.params.id }); // Use deleteOne or findByIdAndDelete
    res.json({ message: 'Report deleted successfully.' });
  } catch (err) {
    console.error("Error deleting report:", err);
    res.status(500).json({ message: 'Server error deleting report.', error: err.message });
  }
};

const viewAttendance = async (req, res) => {
  try {
    const records = await Attendance.find()
        .populate('cleaner', 'name email') // Populate cleaner details
        .sort({ date: -1, checkIn: -1 }); // Sort by date and then check-in time
    res.json(records);
  } catch (err) {
    console.error("Error viewing attendance:", err);
    res.status(500).json({ message: 'Server error viewing attendance.', error: err.message });
  }
};

// New: Get all tasks assigned to a specific cleaner
const getTasksOfCleaner = async (req, res) => {
    try {
        const { cleanerId } = req.params;
        const cleaner = await User.findById(cleanerId);
        if (!cleaner || cleaner.role !== 'cleaner') {
            return res.status(404).json({ message: 'Cleaner not found.' });
        }
        const tasks = await Report.find({ assignedTo: cleanerId })
            .populate('reportedBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        console.error("Error fetching tasks for cleaner:", err);
        res.status(500).json({ message: 'Server error fetching tasks.', error: err.message });
    }
};


const viewCleanerIssues = async (req, res) => {
  try {
    const issues = await CleanerIssue.find()
        .populate('cleaner', 'name email') // Populate cleaner details
        .sort({ createdAt: -1 }); // Show newest issues first
    res.json(issues);
  } catch (err) {
    console.error("Error viewing cleaner issues:", err);
    res.status(500).json({ message: 'Server error viewing issues.', error: err.message });
  }
};

const resolveCleanerIssue = async (req, res) => {
  try {
    const issue = await CleanerIssue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Cleaner issue not found.' });
    
    issue.status = 'resolved';
    await issue.save();
    res.json({ message: 'Cleaner issue marked as resolved.', issue });
  } catch (err) {
    console.error("Error resolving cleaner issue:", err);
    res.status(500).json({ message: 'Server error resolving issue.', error: err.message });
  }
};

// Kept from original, review if still needed for specific admin view or can be part of viewAllReports.
// This is more user-centric. viewAllReports is report-centric.
const getUsersWithReports = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password'); // Get all users who can report

    const usersWithReports = await Promise.all(users.map(async (user) => {
      const reports = await Report.find({ reportedBy: user._id })
        .populate('assignedTo', 'name email')
        .populate('assignedBy', 'name email')
        .sort({ createdAt: -1 });
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        reports
      };
    }));

    res.json(usersWithReports.filter(u => u.reports.length > 0)); // Only return users who have reports
  } catch (err) {
    console.error('Failed to fetch users and reports:', err)
    res.status(500).json({ message: 'Failed to fetch users and reports', error: err.message });
  }
};

// New: Download reports as PDF (Basic Implementation)
const downloadReportsPdf = async (req, res) => {
    try {
        const reports = await Report.find()
            .populate('reportedBy', 'name email')
            .populate('assignedTo', 'name email')
            .populate('assignedBy', 'name email')
            .sort({ createdAt: -1 });

        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const filename = `campus_waste_reports_${Date.now()}.pdf`;
        
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        doc.fontSize(18).text('Campus Waste Management System - Reports', { align: 'center' });
        doc.moveDown();

        reports.forEach(report => {
            doc.fontSize(14).text(`Report: ${report.title}`, { underline: true });
            doc.fontSize(10).text(`ID: ${report._id}`);
            doc.text(`Status: ${report.status}`);
            doc.text(`Location: ${report.location}`);
            doc.text(`Description: ${report.description || 'N/A'}`);
            doc.text(`Reported By: ${report.reportedBy ? report.reportedBy.name : 'N/A'} (${report.reportedBy ? report.reportedBy.email : 'N/A'})`);
            doc.text(`Reported At: ${new Date(report.createdAt).toLocaleString()}`);
            if (report.assignedTo) {
                doc.text(`Assigned To: ${report.assignedTo.name} (${report.assignedTo.email})`);
                doc.text(`Assigned By: ${report.assignedBy ? report.assignedBy.name : 'System'}`);
                doc.text(`Assigned At: ${new Date(report.assignedAt).toLocaleString()}`);
            }
            if (report.status === 'completed' && report.completedAt) {
                doc.text(`Completed At: ${new Date(report.completedAt).toLocaleString()}`);
            }
            doc.moveDown(1.5);
        });

        doc.end();

    } catch (err) {
        console.error("Error generating PDF report:", err);
        res.status(500).json({ message: 'Server error generating PDF report.', error: err.message });
    }
};


module.exports = {
  createCleaner,
  getAllCleaners,
  assignReportToCleaner,
  viewAllReports,
  updateReportStatus,
  deleteCompletedReport,
  viewAttendance,
  getTasksOfCleaner,
  viewCleanerIssues,
  resolveCleanerIssue,
  getUsersWithReports,
  downloadReportsPdf
};