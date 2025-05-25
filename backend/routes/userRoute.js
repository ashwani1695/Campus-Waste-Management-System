const express = require('express');
const multer = require('multer');
const path = require('path');
const { submitReport, getMyReports } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// POST /api/report
router.post('/report', protect, upload.single('image'), submitReport);
router.get('/myreports', protect, getMyReports);

module.exports = router;
