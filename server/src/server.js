import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

const PORT = Number(process.env.PORT || 5000);

if (!process.env.MONGODB_URI) {
  console.error('Thiếu MONGODB_URI trong file .env');
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET phải được cấu hình và có ít nhất 32 ký tự.');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`ClubHub API đang chạy tại http://localhost:${PORT}`));
} catch (error) {
  console.error('Không thể kết nối MongoDB:', error.message);
  process.exit(1);
}
