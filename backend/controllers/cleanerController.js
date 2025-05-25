const Report = require('../models/Report');
const Attendance = require('../models/Attendance');
const CleanerIssue = require('../models/CleanerIssue');
const User = require('../models/User'); // For checking cleaner role


// Get reports/tasks assigned to the logged-in cleaner that are 'assigned' or 'in-progress'
const getAssignedReports = async (req, res) => {
  try {
    const reports = await Report.find({ 
      assignedTo: req.user._id,
      status: { $in: ['assigned', 'in-progress'] } 
    }).populate('reportedBy', 'name email') // Include details of who reported
      .sort({ assignedAt: -1 }); // Show most recently assigned first
    res.json(reports);
  } catch (err) {
    console.error("Error fetching assigned reports for cleaner:", err);
    res.status(500).json({ message: 'Server error fetching assigned reports.', error: err.message });
  }
};

// Update the status of a task assigned to the cleaner
const updateTaskStatus = async (req, res) => {
  try {
    const { reportId } = req.params; // Get reportId from URL parameter
    const { status } = req.body;

    const validCleanerStatuses = ['in-progress', 'completed'];
    if (!status || !validCleanerStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Cleaners can only set status to "in-progress" or "completed".' });
    }

    const report = await Report.findById(reportId);
    if (!report) {
        return res.status(404).json({ message: 'Report not found.'});
    }
    // Verify the report is assigned to this cleaner
    if (String(report.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized. This task is not assigned to you.' });
    }
    // Verify the current status allows this transition
    if (report.status !== 'assigned' && report.status !== 'in-progress') {
        return res.status(400).json({ message: `Cannot update status from "${report.status}". Task must be "assigned" or "in-progress".`})
    }
    if (status === 'in-progress' && report.status === 'in-progress') {
        return res.status(400).json({message: 'Task is already in-progress.'});
    }
    if (status === 'completed' && report.status === 'completed') {
        return res.status(400).json({message: 'Task is already completed.'});
    }


    report.status = status;
    if (status === 'completed') {
      report.completedAt = new Date();
    }
    
    await report.save();
    res.json({ message: `Task status updated to ${status}.`, report });
  } catch (err) {
    console.error("Error updating task status by cleaner:", err);
    res.status(500).json({ message: 'Server error updating task status.', error: err.message });
  }
};

// Cleaner checks in for attendance
const checkInAttendance = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format for date comparison
    const existing = await Attendance.findOne({ 
        cleaner: req.user._id, 
        date: { // Query for records on the same day
            $gte: new Date(today + "T00:00:00.000Z"), // Start of day in UTC
            $lt: new Date(today + "T23:59:59.999Z")  // End of day in UTC
        }
    });

    if (existing && existing.checkIn) {
         return res.status(400).json({ message: 'You have already checked in today.' });
    }
    
    // If existing record without checkIn (should not happen with current flow but defensive)
    if (existing) {
        existing.checkIn = new Date();
        existing.date = new Date(); // update date part if for some reason was different.
        await existing.save();
        return res.status(200).json({ message: 'Checked in successfully.', record: existing });
    }

    const record = new Attendance({ 
        cleaner: req.user._id, 
        date: new Date(), // Store the full date object for precise querying if needed
        checkIn: new Date() 
    });
    await record.save();
    res.status(201).json({ message: 'Checked in successfully.', record });
  } catch (err) {
    console.error("Error during check-in:", err);
    res.status(500).json({ message: 'Server error during check-in.', error: err.message });
  }
};

// Cleaner checks out for attendance
const checkOutAttendance = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const record = await Attendance.findOne({ 
        cleaner: req.user._id, 
        date: {
            $gte: new Date(today + "T00:00:00.000Z"),
            $lt: new Date(today + "T23:59:59.999Z")
        }
    });

    if (!record) {
        return res.status(400).json({ message: 'You have not checked in today. Cannot check out.' });
    }
    if (record.checkOut) {
        return res.status(400).json({ message: 'You have already checked out today.' });
    }
    if (!record.checkIn) { // Should ideally not happen if check-in is mandatory first
        return res.status(400).json({message: 'Error: No check-in found for today, cannot check out.'})
    }

    record.checkOut = new Date();
    await record.save();
    res.json({ message: 'Checked out successfully.', record });
  } catch (err)    {
    console.error("Error during check-out:", err);
    res.status(500).json({ message: 'Server error during check-out.', error: err.message });
  }
};

// Cleaner submits an issue (e.g., broken bin)
const submitCleanerIssue = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
        return res.status(400).json({message: 'Subject and message are required for the issue.'});
    }
    const issue = new CleanerIssue({ 
        cleaner: req.user._id, 
        subject, 
        message,
        // status defaults to 'pending' and createdAt is handled by timestamps
    });
    await issue.save();
    res.status(201).json({ message: 'Issue reported successfully.', issue });
  } catch (err) {
    console.error("Error submitting cleaner issue:", err);
    res.status(500).json({ message: 'Server error submitting issue.', error: err.message });
  }
};

// Get attendance records for the logged-in cleaner
const getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ cleaner: req.user._id })
      .sort({ date: -1 }); // Show most recent records first
    res.json(records);
  } catch (err) {
    console.error("Error fetching cleaner attendance:", err);
    res.status(500).json({ message: 'Server error fetching attendance.', error: err.message });
  }
};

// New: Get cleaner issues submitted by the logged-in cleaner
const getMyCleanerIssues = async (req, res) => {
    try {
        const issues = await CleanerIssue.find({ cleaner: req.user._id })
            .sort({ createdAt: -1 });
        res.json(issues);
    } catch (err) {
        console.error("Error fetching 'my cleaner issues':", err);
        res.status(500).json({ message: 'Server error fetching your issues.', error: err.message });
    }
};

module.exports = {
  getAssignedReports,
  updateTaskStatus,
  checkInAttendance,
  checkOutAttendance,
  submitCleanerIssue,
  getMyAttendance,
  getMyCleanerIssues // New
};