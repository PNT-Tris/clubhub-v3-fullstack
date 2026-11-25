import mongoose from 'mongoose';

const founderSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, lowercase: true, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  responsibility: { type: String, required: true, trim: true, maxlength: 100 }
}, { _id: false });

const clubApplicationSchema = new mongoose.Schema({
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  proposedName: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, required: true, trim: true, minlength: 100, maxlength: 2000 },
  mission: { type: String, required: true, trim: true, minlength: 50, maxlength: 1500 },
  targetMembers: { type: String, required: true, trim: true, minlength: 20, maxlength: 1000 },
  activityPlan: { type: String, required: true, trim: true, minlength: 120, maxlength: 3000 },
  semesterPlan: { type: String, required: true, trim: true, minlength: 80, maxlength: 2500 },
  governancePlan: { type: String, required: true, trim: true, minlength: 80, maxlength: 2000 },
  budgetPlan: { type: String, required: true, trim: true, minlength: 80, maxlength: 2000 },
  foundingMembers: { type: [founderSchema], validate: { validator: (items) => items.length >= 5 && items.length <= 30, message: 'Danh sách sáng lập phải có từ 5 đến 30 người.' } },
  contactEmail: { type: String, required: true, lowercase: true, trim: true },
  contactPhone: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true, maxlength: 160 },
  advisorName: { type: String, trim: true, maxlength: 100 },
  advisorEmail: { type: String, lowercase: true, trim: true },
  rulesAccepted: { type: Boolean, required: true, validate: (value) => value === true },
  status: { type: String, enum: ['pending', 'processing', 'approved', 'rejected'], default: 'pending', index: true },
  reviewNote: { type: String, trim: true, maxlength: 1500, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  createdClub: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' }
}, { timestamps: true });

clubApplicationSchema.index({ applicant: 1, status: 1 });
clubApplicationSchema.index(
  { applicant: 1 },
  { name: 'pending_application_per_applicant', unique: true, partialFilterExpression: { status: 'pending' } }
);
clubApplicationSchema.index({ proposedName: 1, status: 1 });

export default mongoose.model('ClubApplication', clubApplicationSchema);
