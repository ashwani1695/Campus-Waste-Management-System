const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, isAdmin, authorizeRoles } = require('../middlewares/authMiddleware'); // authorizeRoles('admin') is good

// Cleaner Management
router.post('/cleaners', protect, authorizeRoles('admin'), adminController.createCleaner); // Changed from create-cleaner for consistency
router.get('/cleaners', protect, authorizeRoles('admin'), adminController.getAllCleaners);

// Report Management by Admin
router.get('/reports', protect, authorizeRoles('admin'), adminController.viewAllReports);
router.put('/reports/:reportId/assign', protect, authorizeRoles('admin'), adminController.assignReportToCleaner); // ReportId in params
router.put('/reports/:reportId/status', protect, authorizeRoles('admin'), adminController.updateReportStatus); // ReportId in params
router.delete('/reports/:id', protect, authorizeRoles('admin'), adminController.deleteCompletedReport); // id is reportId

// User Reports View (Specialized)
router.get('/users-reports', protect, authorizeRoles('admin'), adminController.getUsersWithReports); // Kept as is

// Cleaner Activity Monitoring by Admin
router.get('/cleaners/:cleanerId/tasks', protect, authorizeRoles('admin'), adminController.getTasksOfCleaner);
router.get('/attendance', protect, authorizeRoles('admin'), adminController.viewAttendance); // All attendance

// Cleaner Issues Management by Admin
router.get('/cleaner-issues', protect, authorizeRoles('admin'), adminController.viewCleanerIssues);
router.put('/cleaner-issues/:id/resolve', protect, authorizeRoles('admin'), adminController.resolveCleanerIssue); // id is issueId

// Download Reports
router.get('/reports/download-pdf', protect, authorizeRoles('admin'), adminController.downloadReportsPdf);

module.exports = router;