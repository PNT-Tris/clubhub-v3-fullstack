import { Router } from 'express';
import Event from '../models/Event.js';
import Membership from '../models/Membership.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function canManageEvent(user, clubId) {
  if (user.role === 'admin') return true;
  if (!clubId) return false;
  return Boolean(await Membership.exists({ club: clubId, user: user._id, status: 'approved', role: { $in: ['owner', 'moderator'] } }));
}

router.get('/mine/registrations', protect, async (req, res, next) => {
  try {
    const events = await Event.find({ 'registrations.user': req.user._id })
      .populate('club', 'name category')
      .sort({ startAt: 1 });
    const results = events.map((event) => {
      const plain = event.toJSON();
      plain.myRegistration = event.registrations.find((item) => String(item.user) === String(req.user._id));
      return plain;
    });
    res.json({ events: results });
  } catch (error) { next(error); }
});

router.get('/', async (req, res, next) => {
  try {
    const filter = { status: 'published' };
    if (req.query.club) filter.club = req.query.club;
    if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
    if (req.query.search) filter.$or = [
      { title: { $regex: escapeRegex(req.query.search), $options: 'i' } },
      { description: { $regex: escapeRegex(req.query.search), $options: 'i' } },
      { location: { $regex: escapeRegex(req.query.search), $options: 'i' } }
    ];
    if (req.query.upcoming === 'true') filter.startAt = { $gte: new Date() };
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 100);
    const [events, total] = await Promise.all([
      Event.find(filter).populate('club', 'name').sort({ startAt: 1 }).skip((page - 1) * limit).limit(limit),
      Event.countDocuments(filter)
    ]);
    res.json({ events, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Event.distinct('category', { status: 'published' });
    res.json({ categories: categories.filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi')) });
  } catch (error) { next(error); }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const { title, description, location, startAt, club } = req.body;
    if (!title?.trim() || !description?.trim() || !location?.trim() || !startAt) {
      return res.status(400).json({ message: 'Tên, mô tả, địa điểm và thời gian bắt đầu là bắt buộc.' });
    }
    if (!Number.isFinite(new Date(startAt).getTime())) return res.status(400).json({ message: 'Thời gian bắt đầu không hợp lệ.' });
    if (club && !(await canManageEvent(req.user, club))) return res.status(403).json({ message: 'Bạn không có quyền tạo sự kiện cho câu lạc bộ này.' });
    if (!club && req.user.role !== 'admin') return res.status(400).json({ message: 'Sự kiện cần thuộc một câu lạc bộ.' });
    const event = await Event.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ message: 'Tạo sự kiện thành công.', event });
  } catch (error) { next(error); }
});

router.get('/manage/all', protect, async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role !== 'admin') {
      const managedClubs = await Membership.find({ user: req.user._id, status: 'approved', role: { $in: ['owner', 'moderator'] } }).distinct('club');
      filter = { club: { $in: managedClubs } };
    }
    const events = await Event.find(filter).populate('club', 'name').sort({ startAt: 1 });
    res.json({ events });
  } catch (error) { next(error); }
});

router.get('/club/:clubId/manage', protect, async (req, res, next) => {
  try {
    if (!(await canManageEvent(req.user, req.params.clubId))) return res.status(403).json({ message: 'Bạn không có quyền quản lý sự kiện của câu lạc bộ này.' });
    const events = await Event.find({ club: req.params.clubId }).populate('club', 'name').sort({ startAt: 1 });
    res.json({ events });
  } catch (error) { next(error); }
});

router.get('/:id/registration/me', protect, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).select('registrations');
    if (!event) return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    const registration = event.registrations.find((item) => String(item.user) === String(req.user._id));
    res.json({ registration: registration || null });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, status: { $ne: 'draft' } }).populate('club', 'name category');
    if (!event) return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    res.json({ event });
  } catch (error) { next(error); }
});

router.put('/:id', protect, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    if (!(await canManageEvent(req.user, event.club))) return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa sự kiện này.' });
    const allowed = ['title', 'description', 'content', 'category', 'cover', 'location', 'startAt', 'endAt', 'capacity', 'status', 'club', 'requiresClubMembership'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (updates.club && !(await canManageEvent(req.user, updates.club))) return res.status(403).json({ message: 'Bạn không có quyền chuyển sự kiện sang câu lạc bộ này.' });
    Object.assign(event, updates);
    await event.save();
    res.json({ message: 'Đã cập nhật sự kiện.', event });
  } catch (error) { next(error); }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    if (!(await canManageEvent(req.user, event.club))) return res.status(403).json({ message: 'Bạn không có quyền xóa sự kiện này.' });
    await event.deleteOne();
    res.json({ message: 'Đã xóa sự kiện.' });
  } catch (error) { next(error); }
});

router.post('/:id/register', protect, async (req, res, next) => {
  try {
    const existingEvent = await Event.findById(req.params.id);
    if (!existingEvent || existingEvent.status !== 'published') return res.status(404).json({ message: 'Sự kiện không tồn tại hoặc không mở đăng ký.' });
    const now = new Date();
    if (new Date(existingEvent.startAt) <= now) return res.status(400).json({ message: 'Sự kiện đã bắt đầu, không thể đăng ký.' });
    if (existingEvent.requiresClubMembership && existingEvent.club) {
      const membership = await Membership.findOne({ club: existingEvent.club, user: req.user._id, status: 'approved' });
      if (!membership) return res.status(403).json({ message: 'Sự kiện này dành cho thành viên đã được duyệt của câu lạc bộ.' });
    }
    // Cập nhật có điều kiện ngay tại MongoDB để tránh vượt sức chứa khi nhiều người đăng ký đồng thời.
    const updated = await Event.findOneAndUpdate({
      _id: req.params.id,
      status: 'published',
      startAt: { $gt: now },
      'registrations.user': { $ne: req.user._id },
      $expr: { $lt: [{ $size: { $ifNull: ['$registrations', []] } }, '$capacity'] }
    }, { $push: { registrations: { user: req.user._id, registeredAt: now, attended: false } } }, { new: true, runValidators: true });
    if (updated) return res.status(201).json({ message: 'Đăng ký sự kiện thành công.', registrationsCount: updated.registrations.length });
    const latest = await Event.findById(req.params.id);
    if (!latest) return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    if (latest.registrations.some((item) => String(item.user) === String(req.user._id))) return res.status(409).json({ message: 'Bạn đã đăng ký sự kiện này.' });
    if (latest.registrations.length >= latest.capacity) return res.status(409).json({ message: 'Sự kiện đã đủ số lượng tham gia.' });
    return res.status(409).json({ message: 'Sự kiện vừa thay đổi trạng thái. Vui lòng tải lại trang.' });
  } catch (error) { next(error); }
});

router.delete('/:id/register', protect, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    if (new Date(event.startAt) <= new Date()) return res.status(400).json({ message: 'Sự kiện đã bắt đầu, không thể hủy đăng ký.' });
    const before = event.registrations.length;
    event.registrations = event.registrations.filter((item) => String(item.user) !== String(req.user._id));
    if (event.registrations.length === before) return res.status(404).json({ message: 'Bạn chưa đăng ký sự kiện này.' });
    await event.save();
    res.json({ message: 'Đã hủy đăng ký sự kiện.' });
  } catch (error) { next(error); }
});

router.get('/:id/registrations', protect, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('club', 'name');
    if (!event) return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    if (!(await canManageEvent(req.user, event.club?._id || event.club))) return res.status(403).json({ message: 'Bạn không có quyền xem danh sách đăng ký.' });
    await event.populate('registrations.user', 'name email phone');
    res.json({ registrations: event.registrations });
  } catch (error) { next(error); }
});

router.patch('/:id/attendance/:userId', protect, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Không tìm thấy sự kiện.' });
    if (!(await canManageEvent(req.user, event.club))) return res.status(403).json({ message: 'Bạn không có quyền điểm danh sự kiện này.' });
    const registration = event.registrations.find((item) => String(item.user) === String(req.params.userId));
    if (!registration) return res.status(404).json({ message: 'Người dùng chưa đăng ký sự kiện.' });
    registration.attended = Boolean(req.body.attended);
    await event.save();
    res.json({ message: 'Đã cập nhật trạng thái điểm danh.', attended: registration.attended });
  } catch (error) { next(error); }
});

export default router;
