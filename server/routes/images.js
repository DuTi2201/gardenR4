const express = require('express');
const router = express.Router({ mergeParams: true });

// Giả định controller sẽ được tạo sau
const imagesController = {
  getImages: (req, res) => {
    res.status(200).json({
      success: true,
      data: []
    });
  },
  getImage: (req, res) => {
    res.status(200).json({
      success: true,
      data: {}
    });
  }
};

// Routes
router.get('/', imagesController.getImages);
router.get('/:imageId', imagesController.getImage);

module.exports = router; 