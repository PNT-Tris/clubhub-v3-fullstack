import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Club from '../models/Club.js';
import Event from '../models/Event.js';
import Membership from '../models/Membership.js';

if (!process.env.MONGODB_URI) throw new Error('Thiếu MONGODB_URI trong file .env');
await mongoose.connect(process.env.MONGODB_URI);

const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@clubhub.local').toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD || '';
let admin = await User.findOne({ email: adminEmail });
const adminWasCreated = !admin;
if (!admin) {
  if (adminPassword.length < 14) throw new Error('Khi tạo Admin mới, SEED_ADMIN_PASSWORD phải có ít nhất 14 ký tự và cần được đặt trong server/.env.');
  admin = await User.create({ name: process.env.SEED_ADMIN_NAME || 'ClubHub Administrator', email: adminEmail, password: await bcrypt.hash(adminPassword, 12), role: 'admin', authProviders: ['password'] });
  console.log(`Đã tạo admin: ${adminEmail}`);
} else if (admin.role !== 'admin') {
  throw new Error(`Email SEED_ADMIN_EMAIL (${adminEmail}) đã thuộc tài khoản thường. Hãy chọn một email Admin chưa được đăng ký hoặc kiểm tra và nâng quyền thủ công trong cơ sở dữ liệu; seed không tự nâng quyền để tránh chiếm quyền tài khoản.`);
} else {
  if (!admin.authProviders?.length && admin.password) { admin.authProviders = ['password']; await admin.save(); }
  console.log(`Admin đã tồn tại: ${adminEmail} (giữ nguyên mật khẩu hiện tại).`);
}

const samples = [
  { name: 'IU Club – Information Technology', category: 'Công nghệ', description: 'Cộng đồng sinh viên yêu thích công nghệ thông tin, dữ liệu, trí tuệ nhân tạo và các hoạt động học thuật.' },
  { name: 'Media & Creative Club', category: 'Truyền thông', description: 'Không gian sáng tạo nội dung, thiết kế, nhiếp ảnh, video và truyền thông sự kiện.' },
  { name: 'English Connection Club', category: 'Ngoại ngữ', description: 'Kết nối sinh viên qua hoạt động giao tiếp tiếng Anh, workshop và chia sẻ văn hóa.' },
  { name: 'Volunteer & Green Club', category: 'Tình nguyện', description: 'Lan tỏa tinh thần sẻ chia thông qua các hoạt động thiện nguyện và bảo vệ môi trường.' }
];
const clubs = [];
for (const item of samples) {
  let club = await Club.findOne({ name: item.name });
  if (!club) club = await Club.create({ ...item, contactEmail: adminEmail, location: 'PTIT – Hà Nội', createdBy: admin._id, joinApprovalRequired: true });
  // Chỉ tạo Chủ nhiệm mặc định khi CLB chưa có Chủ nhiệm. Không ghi đè người kế nhiệm
  // nếu quản trị viên chạy seed lại sau khi CLB đã chuyển giao quyền sở hữu.
  const currentOwner = await Membership.findOne({ club: club._id, status: 'approved', role: 'owner' });
  if (!currentOwner) {
    await Membership.findOneAndUpdate(
      { club: club._id, user: admin._id },
      { $set: { status: 'approved', role: 'owner', reviewedBy: admin._id, reviewedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  clubs.push(club);
}

const future = (days, hour = 9) => { const date = new Date(); date.setDate(date.getDate() + days); date.setHours(hour, 0, 0, 0); return date; };
const eventSamples = [
  { title: 'AI & Data: Từ ý tưởng đến sản phẩm', description: 'Workshop giới thiệu lộ trình phát triển sản phẩm ứng dụng AI và dữ liệu trong thực tế.', category: 'Workshop', location: 'Hội trường A1 – PTIT', startAt: future(10), capacity: 120, club: clubs[0]._id },
  { title: 'Creative Campus: Kể chuyện bằng hình ảnh', description: 'Buổi thực hành sáng tạo nội dung hình ảnh và video dành cho sinh viên.', category: 'Sáng tạo', location: 'Phòng Lab Media – PTIT', startAt: future(14, 14), capacity: 80, club: clubs[1]._id },
  { title: 'English Speaking Meetup', description: 'Gặp gỡ, luyện giao tiếp và trao đổi chủ đề bằng tiếng Anh trong môi trường thân thiện.', category: 'Giao lưu', location: 'Sảnh thư viện – PTIT', startAt: future(18, 15), capacity: 60, club: clubs[2]._id },
  { title: 'Green Campus Weekend', description: 'Hoạt động làm sạch khuôn viên và lan tỏa thói quen sống xanh.', category: 'Tình nguyện', location: 'Khuôn viên PTIT', startAt: future(22, 7), capacity: 100, club: clubs[3]._id }
];
for (const item of eventSamples) {
  const exists = await Event.findOne({ title: item.title });
  if (!exists) await Event.create({ ...item, createdBy: admin._id, status: 'published' });
}

console.log(`Seed hoàn tất: ${clubs.length} câu lạc bộ mẫu, ${eventSamples.length} sự kiện mẫu.`);
if (adminWasCreated) console.log('Thông tin admin mới tạo:', adminEmail, '/', adminPassword);
else console.log('Admin đã tồn tại: dùng mật khẩu hiện tại, seed không thay đổi mật khẩu.');
console.log('Hãy đặt mật khẩu mạnh và đổi thông tin demo trước khi đưa website lên Internet.');
await mongoose.disconnect();
