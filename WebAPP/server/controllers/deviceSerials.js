const DeviceSerial = require('../models/DeviceSerial');
const Garden = require('../models/Garden');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');

// Helper function tạo lỗi
const createError = (message, statusCode) => {
  return new ErrorResponse(message, statusCode);
};

/**
 * @desc    Lấy danh sách tất cả các mã thiết bị
 * @route   GET /api/admin/device-serials
 * @access  Private/Admin
 */
exports.getDeviceSerials = async (req, res, next) => {
  try {
    // Tìm tất cả serials và populate thông tin user
    const deviceSerials = await DeviceSerial.find()
      .populate({
        path: 'activated_by',
        select: 'fullname email avatar created_at last_login'
      })
      .populate('garden_id', 'name description created_at')
      .sort('-created_at');

    res.status(200).json({
      success: true,
      count: deviceSerials.length,
      data: deviceSerials
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy chi tiết một mã thiết bị
 * @route   GET /api/admin/device-serials/:id
 * @access  Private/Admin
 */
exports.getDeviceSerial = async (req, res, next) => {
  try {
    // Tìm serial theo ID và populate thông tin user
    const deviceSerial = await DeviceSerial.findById(req.params.id)
      .populate({
        path: 'activated_by',
        select: 'fullname email avatar created_at last_login'
      })
      .populate('garden_id', 'name description created_at');

    if (!deviceSerial) {
      return next(
        createError(`Không tìm thấy mã thiết bị với id ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: deviceSerial
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo mã thiết bị mới
 * @route   POST /api/admin/device-serials
 * @access  Private/Admin
 */
exports.createDeviceSerial = async (req, res, next) => {
  try {
    // Kiểm tra xem serial đã tồn tại chưa
    const existingSerial = await DeviceSerial.findOne({ serial: req.body.serial });
    if (existingSerial) {
      return next(
        createError(`Mã thiết bị ${req.body.serial} đã tồn tại trong hệ thống`, 400)
      );
    }

    // Kiểm tra xem camera_serial đã tồn tại chưa (nếu có)
    if (req.body.camera_serial && req.body.camera_serial.trim() !== '') {
      const existingCameraSerial = await DeviceSerial.findOne({ camera_serial: req.body.camera_serial });
      if (existingCameraSerial) {
        return next(
          createError(`Mã camera ${req.body.camera_serial} đã tồn tại trong hệ thống`, 400)
        );
      }
    }

    // Tạo mã thiết bị mới
    const deviceSerial = await DeviceSerial.create(req.body);

    res.status(201).json({
      success: true,
      data: deviceSerial
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật mã thiết bị
 * @route   PUT /api/admin/device-serials/:id
 * @access  Private/Admin
 */
exports.updateDeviceSerial = async (req, res, next) => {
  try {
    // Tìm và cập nhật
    const deviceSerial = await DeviceSerial.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!deviceSerial) {
      return next(
        createError(`Không tìm thấy mã thiết bị với id ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: deviceSerial
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa mã thiết bị
 * @route   DELETE /api/admin/device-serials/:id
 * @access  Private/Admin
 */
exports.deleteDeviceSerial = async (req, res, next) => {
  try {
    console.log(`Đang xử lý request xóa mã thiết bị ${req.params.id}, force=${req.query.force}`);
    
    // Tìm serial
    const deviceSerial = await DeviceSerial.findById(req.params.id);

    if (!deviceSerial) {
      console.log(`Không tìm thấy mã thiết bị với id ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy mã thiết bị với id ${req.params.id}`
      });
    }

    console.log(`Tìm thấy mã thiết bị: ${deviceSerial.serial}, is_activated=${deviceSerial.is_activated}`);

    // Kiểm tra nếu đã được kích hoạt thì không cho xóa, trừ khi có tham số force=true
    if (deviceSerial.is_activated && req.query.force !== 'true') {
      console.log(`Từ chối xóa mã thiết bị đã kích hoạt ${deviceSerial.serial} khi không có force=true`);
      return res.status(400).json({
        success: false,
        message: `Không thể xóa mã thiết bị đã được kích hoạt. Vui lòng hủy kích hoạt trước hoặc sử dụng tham số force=true.`
      });
    }

    // Nếu force=true và đã được kích hoạt, cập nhật vườn để gỡ liên kết
    if (deviceSerial.is_activated && req.query.force === 'true') {
      console.log(`Xóa bắt buộc mã thiết bị đã kích hoạt ${deviceSerial.serial}`);
      
      // Kiểm tra garden_id
      if (deviceSerial.garden_id) {
        console.log(`Mã thiết bị có garden_id: ${deviceSerial.garden_id}`);
        
        try {
          // Kiểm tra xem có garden_id và nó có phải là ObjectId hợp lệ không
          if (mongoose.Types.ObjectId.isValid(deviceSerial.garden_id)) {
            // Tìm vườn và cập nhật
            const garden = await Garden.findById(deviceSerial.garden_id);
            
            if (garden) {
              console.log(`Tìm thấy vườn liên kết: ${garden._id}, name=${garden.name}`);
              
              // Kiểm tra nếu vườn đang sử dụng serial này
              if (garden.device_serial === deviceSerial.serial) {
                console.log(`Gỡ bỏ liên kết mã thiết bị ${deviceSerial.serial} khỏi vườn ${garden._id}`);
                garden.device_serial = '';
                garden.is_connected = false;
                await garden.save();
                console.log('Đã cập nhật vườn thành công');
              }

              // Kiểm tra nếu vườn đang sử dụng camera serial này
              if (deviceSerial.camera_serial && garden.camera_serial === deviceSerial.camera_serial) {
                console.log(`Gỡ bỏ liên kết camera ${deviceSerial.camera_serial} khỏi vườn ${garden._id}`);
                garden.camera_serial = '';
                garden.camera_is_connected = false;
                await garden.save();
                console.log('Đã cập nhật trạng thái camera thành công');
              }
            } else {
              console.log(`Không tìm thấy vườn với id ${deviceSerial.garden_id}`);
            }
          } else {
            console.log(`garden_id không hợp lệ: ${deviceSerial.garden_id}`);
          }
        } catch (gardenError) {
          console.error('Lỗi khi cập nhật vườn:', gardenError);
          // Không throw lỗi, vẫn tiếp tục xóa
        }
      } else {
        console.log('Mã thiết bị không có liên kết với vườn nào');
      }
    }

    // Xóa mã thiết bị
    try {
      console.log(`Đang xóa mã thiết bị ${deviceSerial.serial}`);
      await DeviceSerial.deleteOne({ _id: deviceSerial._id });
      console.log(`Đã xóa mã thiết bị ${deviceSerial.serial} thành công`);
    } catch (deleteError) {
      console.error('Lỗi khi xóa mã thiết bị:', deleteError);
      return res.status(500).json({
        success: false,
        message: `Không thể xóa mã thiết bị: ${deleteError.message}`
      });
    }

    console.log('Gửi response thành công');
    res.status(200).json({
      success: true,
      message: 'Đã xóa mã thiết bị thành công',
      data: {}
    });
  } catch (error) {
    console.error('Lỗi ngoại lệ khi xóa mã thiết bị:', error);
    res.status(500).json({
      success: false,
      message: `Lỗi xử lý: ${error.message || 'Lỗi không xác định'}`
    });
  }
};

/**
 * @desc    Tạo nhiều mã thiết bị cùng lúc
 * @route   POST /api/admin/device-serials/batch
 * @access  Private/Admin
 */
exports.createDeviceSerialBatch = async (req, res, next) => {
  try {
    const { serials, prefix, count, startNumber } = req.body;

    let serialsToCreate = [];

    // Nếu có mảng serials cụ thể
    if (serials && Array.isArray(serials) && serials.length > 0) {
      serialsToCreate = serials.map(serial => ({ serial: serial.trim() }));
    } 
    // Nếu có prefix, count và startNumber thì tạo theo pattern
    else if (prefix && count && startNumber) {
      const startNum = parseInt(startNumber);
      for (let i = 0; i < parseInt(count); i++) {
        // Tạo số với padding zeroes (ví dụ: 001, 002, ...)
        const num = (startNum + i).toString().padStart(4, '0');
        serialsToCreate.push({ serial: `${prefix}${num}` });
      }
    } else {
      return next(
        createError(
          'Vui lòng cung cấp mảng serials hoặc prefix, count và startNumber để tạo batch',
          400
        )
      );
    }

    // Kiểm tra xem có serial nào đã tồn tại chưa
    const existingSerials = await DeviceSerial.find({
      serial: { $in: serialsToCreate.map(s => s.serial) }
    });

    if (existingSerials.length > 0) {
      return next(
        createError(
          `Các mã sau đã tồn tại: ${existingSerials.map(s => s.serial).join(', ')}`,
          400
        )
      );
    }

    // Tạo hàng loạt
    const result = await DeviceSerial.insertMany(serialsToCreate);

    res.status(201).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xem thông tin người dùng đã kích hoạt serial
 * @route   GET /api/admin/device-serials/:id/user
 * @access  Private/Admin
 */
exports.getDeviceSerialUser = async (req, res, next) => {
  try {
    const deviceSerial = await DeviceSerial.findById(req.params.id)
      .populate({
        path: 'activated_by',
        select: 'fullname email avatar created_at last_login'
      });

    if (!deviceSerial) {
      return next(
        createError(`Không tìm thấy mã thiết bị với id ${req.params.id}`, 404)
      );
    }

    if (!deviceSerial.activated_by) {
      return next(
        createError(`Mã thiết bị này chưa được kích hoạt bởi người dùng nào`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: deviceSerial.activated_by
    });
  } catch (error) {
    next(error);
  }
}; 