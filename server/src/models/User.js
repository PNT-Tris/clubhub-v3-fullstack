import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  // Email vẫn bắt buộc để tương thích dữ liệu V2. Tài khoản phone-only dùng email nội bộ .invalid.
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  emailVerified: { type: Boolean, default: false },
  password: { type: String, select: false },
  // admin là quản trị viên toàn hệ thống. Quyền Chủ nhiệm nằm trong Membership.role.
  role: { type: String, enum: ['member', 'admin'], default: 'member', index: true },
  avatar: { type: String, default: '' },
  phone: { type: String, trim: true },
  googleId: { type: String },
  facebookId: { type: String },
  authProviders: { type: [String], enum: ['password', 'google', 'facebook', 'phone'], default: [] }
}, { timestamps: true });

// Partial unique indexes bỏ qua chuỗi rỗng còn sót lại từ dữ liệu V2.
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string', $gt: '' } } });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ facebookId: 1 }, { unique: true, sparse: true });

export default mongoose.model('User', userSchema);
