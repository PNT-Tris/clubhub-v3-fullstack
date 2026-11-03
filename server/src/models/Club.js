import mongoose from 'mongoose';

const founderSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, trim: true, lowercase: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  responsibility: { type: String, required: true, trim: true, maxlength: 100 }
}, { _id: false });

const clubSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  mission: { type: String, trim: true, maxlength: 1500, default: '' },
  targetMembers: { type: String, trim: true, maxlength: 1000, default: '' },
  activityPlan: { type: String, trim: true, maxlength: 3000, default: '' },
  semesterPlan: { type: String, trim: true, maxlength: 2500, default: '' },
  governancePlan: { type: String, trim: true, maxlength: 2000, default: '' },
  budgetPlan: { type: String, trim: true, maxlength: 2000, default: '' },
  foundingMembers: { type: [founderSchema], default: [] },
  advisorName: { type: String, trim: true, maxlength: 100, default: '' },
  advisorEmail: { type: String, trim: true, lowercase: true, default: '' },
  category: { type: String, default: 'Cộng đồng', trim: true },
  logo: { type: String, default: '' },
  cover: { type: String, default: '' },
  contactEmail: { type: String, trim: true, lowercase: true },
  contactPhone: { type: String, trim: true },
  location: { type: String, trim: true, default: 'PTIT' },
  joinApprovalRequired: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Club', clubSchema);
