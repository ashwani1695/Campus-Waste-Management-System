const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.post('/create-cleaner', protect, authorizeRoles('admin'), adminController.createCleaner);
router.put('/assign-report', protect, authorizeRoles('admin'), adminController.assignReportToCleaner);
router.get('/reports', protect, authorizeRoles('admin'), adminController.viewAllReports);
router.put('/report-status', protect, authorizeRoles('admin'), adminController.updateReportStatus);
router.delete('/report/:id', protect, authorizeRoles('admin'), adminController.deleteCompletedReport);
router.get('/attendance', protect, authorizeRoles('admin'), adminController.viewAttendance);
router.get('/cleaner-issues', protect, authorizeRoles('admin'), adminController.viewCleanerIssues);
router.put('/cleaner-issue/:id/resolve', protect, authorizeRoles('admin'), adminController.resolveCleanerIssue);

module.exports = router;