const express = require('express');
const router = express.Router();
const cleanerController = require('../controllers/cleanerController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

// Task Management for Cleaner
router.get('/tasks', protect, authorizeRoles('cleaner'), cleanerController.getAssignedReports); // Get assigned tasks
router.put('/tasks/:reportId/status', protect, authorizeRoles('cleaner'), cleanerController.updateTaskStatus); // Update task status (reportId in param)

// Attendance for Cleaner
router.post('/attendance/check-in', protect, authorizeRoles('cleaner'), cleanerController.checkInAttendance);
router.post('/attendance/check-out', protect, authorizeRoles('cleaner'), cleanerController.checkOutAttendance);
router.get('/attendance', protect, authorizeRoles('cleaner'), cleanerController.getMyAttendance); // Get own attendance

// Issue Reporting by Cleaner
router.post('/issues', protect, authorizeRoles('cleaner'), cleanerController.submitCleanerIssue); // Submit an issue
router.get('/issues', protect, authorizeRoles('cleaner'), cleanerController.getMyCleanerIssues); // View own submitted issues


module.exports = router;