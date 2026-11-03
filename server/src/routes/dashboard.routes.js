import { Router } from 'express';
import User from '../models/User.js';
import Club from '../models/Club.js';
import Event from '../models/Event.js';
import Membership from '../models/Membership.js';
import { protect, adminOnly } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/stats', protect, adminOnly, async (req, res, next) => {
  try {
    const [events, clubs, members, memberships, registrationAgg] = await Promise.all([
      Event.countDocuments(), Club.countDocuments({ isActive: true }), User.countDocuments(),
      Membership.countDocuments({ status: 'approved' }),
      Event.aggregate([{ $project: { count: { $size: '$registrations' } } }, { $group: { _id: null, total: { $sum: '$count' } } }])
    ]);
    res.json({ events, clubs, members, memberships, registrations: registrationAgg[0]?.total || 0 });
  } catch (error) { next(error); }
});

router.get('/recent', protect, adminOnly, async (req, res, next) => {
  try {
    const [events, clubs, users] = await Promise.all([
      Event.find().populate('club', 'name').sort({ createdAt: -1 }).limit(5),
      Club.find().sort({ createdAt: -1 }).limit(5),
      User.find().select('name email role createdAt').sort({ createdAt: -1 }).limit(5)
    ]);
    res.json({ events, clubs, users });
  } catch (error) { next(error); }
});

export default router;
