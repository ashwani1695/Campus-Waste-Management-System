const express = require('express');
const router = express.Router();
const cleanerController = require('../controllers/cleanerController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/tasks', protect, authorizeRoles('cleaner'), cleanerController.getAssignedReports);
router.put('/task-status', protect, authorizeRoles('cleaner'), cleanerController.updateTaskStatus);
router.post('/check-in', protect, authorizeRoles('cleaner'), cleanerController.checkInAttendance);
router.post('/check-out', protect, authorizeRoles('cleaner'), cleanerController.checkOutAttendance);
router.post('/issue', protect, authorizeRoles('cleaner'), cleanerController.submitCleanerIssue);
router.get('/attendance', protect, authorizeRoles('cleaner'), cleanerController.getMyAttendance);

module.exports = router;