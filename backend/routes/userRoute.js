const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.post('/report', protect, authorizeRoles('user'), userController.submitReport);
router.get('/my-reports', protect, authorizeRoles('user'), userController.getMyReports);

module.exports = router;
