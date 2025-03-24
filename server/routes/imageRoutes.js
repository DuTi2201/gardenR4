const express = require('express');
const { 
  getImages,
  getImage,
  captureImage,
  deleteImage
} = require('../controllers/images');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Áp dụng middleware bảo vệ cho tất cả các routes
router.use(protect);

router.route('/')
  .get(getImages);

router.route('/capture')
  .post(captureImage);

router.route('/:id')
  .get(getImage)
  .delete(deleteImage);

module.exports = router; 