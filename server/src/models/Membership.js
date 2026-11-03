import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema({
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  role: { type: String, enum: ['owner', 'moderator', 'member'], default: 'member' },
  requestedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Một người chỉ có một hồ sơ thành viên trong cùng một CLB.
membershipSchema.index({ club: 1, user: 1 }, { unique: true });
// Mỗi CLB chỉ có tối đa một Chủ nhiệm đang được duyệt.
membershipSchema.index({ club: 1 }, { unique: true, partialFilterExpression: { status: 'approved', role: 'owner' } });

export default mongoose.model('Membership', membershipSchema);
