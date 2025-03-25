const DeviceSerial = require('../models/DeviceSerial');
const Garden = require('../models/Garden');
const ErrorResponse = require('../utils/errorResponse');

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
        new ErrorResponse(`Không tìm thấy mã thiết bị với id ${req.params.id}`, 404)
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
        new ErrorResponse(`Mã thiết bị ${req.body.serial} đã tồn tại trong hệ thống`, 400)
      );
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
        new ErrorResponse(`Không tìm thấy mã thiết bị với id ${req.params.id}`, 404)
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
    // Tìm serial
    const deviceSerial = await DeviceSerial.findById(req.params.id);

    if (!deviceSerial) {
      return next(
        new ErrorResponse(`Không tìm thấy mã thiết bị với id ${req.params.id}`, 404)
      );
    }

    // Kiểm tra nếu đã được kích hoạt thì không cho xóa
    if (deviceSerial.is_activated) {
      return next(
        new ErrorResponse(
          `Không thể xóa mã thiết bị đã được kích hoạt. Vui lòng hủy kích hoạt trước.`,
          400
        )
      );
    }

    // Xóa
    await deviceSerial.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
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
        new ErrorResponse(
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
        new ErrorResponse(
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
        new ErrorResponse(`Không tìm thấy mã thiết bị với id ${req.params.id}`, 404)
      );
    }

    if (!deviceSerial.activated_by) {
      return next(
        new ErrorResponse(`Mã thiết bị này chưa được kích hoạt bởi người dùng nào`, 404)
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