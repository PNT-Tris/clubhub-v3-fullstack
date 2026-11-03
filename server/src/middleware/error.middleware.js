import mongoose from 'mongoose';

export function notFound(req, res) {
  return res.status(404).json({ message: `Không tìm thấy API: ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  console.error(`[${req.method} ${req.originalUrl}]`, error);
  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: 'ID dữ liệu không hợp lệ.' });
  }
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ message: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: 'Dữ liệu đã tồn tại.' });
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ message: 'Dữ liệu JSON không hợp lệ.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Dữ liệu gửi lên quá lớn.' });
  }
  const status = error.status || 500;
  return res.status(status).json({ message: status === 500 ? 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại.' : error.message });
}
