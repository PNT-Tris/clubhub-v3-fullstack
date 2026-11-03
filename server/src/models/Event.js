import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  registeredAt: { type: Date, default: Date.now },
  attended: { type: Boolean, default: false }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  content: { type: String, default: '' },
  category: { type: String, default: 'Workshop', trim: true },
  cover: { type: String, default: '' },
  location: { type: String, required: true, trim: true },
  startAt: { type: Date, required: true },
  endAt: Date,
  capacity: { type: Number, min: 1, default: 100 },
  status: { type: String, enum: ['draft', 'published', 'cancelled'], default: 'published' },
  requiresClubMembership: { type: Boolean, default: false },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  registrations: { type: [registrationSchema], default: [] }
}, { timestamps: true });

eventSchema.pre('validate', function (next) {
  if (this.endAt && this.startAt && new Date(this.endAt) < new Date(this.startAt)) {
    this.invalidate('endAt', 'Thời gian kết thúc phải sau thời gian bắt đầu.');
  }
  next();
});

eventSchema.virtual('registrationsCount').get(function () {
  return this.registrations?.length || 0;
});
eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

export default mongoose.model('Event', eventSchema);
