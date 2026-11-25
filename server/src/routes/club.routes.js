import { Router } from 'express';
import Club from '../models/Club.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Event from '../models/Event.js';
import { protect, adminOnly, clubManagerOnly, clubOwnerOnly } from '../middleware/auth.middleware.js';

const router = Router();
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Club.distinct('category', { isActive: true });
    res.json({ categories: categories.filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi')) });
  } catch (error) { next(error); }
});

// Lấy danh sách CLB; hỗ trợ tìm kiếm, lọc danh mục và phân trang.
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
    const filter = { isActive: true };
    if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
    if (req.query.search) filter.$or = [
      { name: { $regex: escapeRegex(req.query.search), $options: 'i' } },
      { description: { $regex: escapeRegex(req.query.search), $options: 'i' } }
    ];
    const [clubs, total] = await Promise.all([
      Club.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Club.countDocuments(filter)
    ]);
    const counts = await Membership.aggregate([
      { $match: { club: { $in: clubs.map((club) => club._id) }, status: 'approved' } },
      { $group: { _id: '$club', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
    const publicClubs = clubs.map((club) => {
      const { foundingMembers, budgetPlan, advisorEmail, ...publicFields } = club;
      return { ...publicFields, foundingMembers: (foundingMembers || []).map(({ name, responsibility }) => ({ name, responsibility })), membersCount: countMap.get(String(club._id)) || 0 };
    });
    res.json({ clubs: publicClubs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

// Các CLB và yêu cầu tham gia của tài khoản hiện tại.
router.get('/mine/memberships', protect, async (req, res, next) => {
  try {
    const memberships = await Membership.find({ user: req.user._id })
      .populate('club', 'name category logo cover description isActive')
      .sort({ updatedAt: -1 });
    res.json({ memberships });
  } catch (error) { next(error); }
});

// Không tạo CLB trực tiếp: mọi CLB mới phải đi qua hồ sơ và được Admin hệ thống phê duyệt.
router.post('/', protect, adminOnly, async (req, res) => {
  res.status(409).json({ message: 'Không tạo CLB trực tiếp. Hãy xét duyệt hồ sơ tại /api/club-applications/admin; khi phê duyệt, hệ thống tự tạo CLB và gán người đề xuất làm Chủ nhiệm.' });
});

router.get('/manage/all', protect, adminOnly, async (req, res, next) => {
  try {
    const clubs = await Club.find().sort({ createdAt: -1 }).lean();
    const counts = await Membership.aggregate([
      { $match: { club: { $in: clubs.map((club) => club._id) }, status: 'approved' } },
      { $group: { _id: '$club', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
    res.json({ clubs: clubs.map((club) => ({ ...club, membersCount: countMap.get(String(club._id)) || 0 })) });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const club = await Club.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!club) return res.status(404).json({ message: 'Không tìm thấy câu lạc bộ.' });
    const membersCount = await Membership.countDocuments({ club: club._id, status: 'approved' });
    // Không công khai email/số điện thoại cá nhân của đội ngũ sáng lập.
    const { foundingMembers, budgetPlan, advisorEmail, ...publicFields } = club;
    const publicClub = { ...publicFields, foundingMembers: (foundingMembers || []).map(({ name, responsibility }) => ({ name, responsibility })) };
    res.json({ club: { ...publicClub, membersCount } });
  } catch (error) { next(error); }
});

// Trạng thái tham gia của chính người đang đăng nhập.
router.get('/:id/membership/me', protect, async (req, res, next) => {
  try {
    const membership = await Membership.findOne({ club: req.params.id, user: req.user._id });
    res.json({ membership });
  } catch (error) { next(error); }
});

// Gửi yêu cầu tham gia. CLB có thể bật/tắt chế độ cần Chủ nhiệm duyệt.
router.post('/:id/join', protect, async (req, res, next) => {
  try {
    const club = await Club.findOne({ _id: req.params.id, isActive: true });
    if (!club) return res.status(404).json({ message: 'Câu lạc bộ không tồn tại hoặc đã ngừng hoạt động.' });
    const status = club.joinApprovalRequired ? 'pending' : 'approved';
    let membership = await Membership.findOne({ club: club._id, user: req.user._id });
    if (membership?.status === 'approved') return res.status(409).json({ message: 'Bạn đã là thành viên của câu lạc bộ này.', membership });
    if (membership?.status === 'pending') return res.status(409).json({ message: 'Yêu cầu tham gia của bạn đang chờ duyệt.', membership });
    if (membership) {
      membership.status = status;
      membership.role = 'member';
      membership.requestedAt = new Date();
      membership.reviewedAt = status === 'approved' ? new Date() : undefined;
      membership.reviewedBy = undefined;
      await membership.save();
    } else {
      membership = await Membership.create({ club: club._id, user: req.user._id, status, role: 'member', reviewedAt: status === 'approved' ? new Date() : undefined });
    }
    res.status(201).json({ message: status === 'approved' ? 'Bạn đã tham gia câu lạc bộ.' : 'Đã gửi yêu cầu tham gia. Vui lòng chờ Ban chủ nhiệm duyệt.', membership });
  } catch (error) { next(error); }
});

// Thành viên tự rời CLB hoặc rút yêu cầu đang chờ; owner không thể tự rời.
router.delete('/:id/membership', protect, async (req, res, next) => {
  try {
    const membership = await Membership.findOne({ club: req.params.id, user: req.user._id });
    if (!membership) return res.status(404).json({ message: 'Bạn chưa đăng ký tham gia câu lạc bộ này.' });
    if (membership.role === 'owner') return res.status(400).json({ message: 'Chủ nhiệm cần chuyển quyền Chủ nhiệm trước khi rời câu lạc bộ.' });
    await membership.deleteOne();
    res.json({ message: membership.status === 'pending' ? 'Đã rút yêu cầu tham gia.' : 'Bạn đã rời câu lạc bộ.' });
  } catch (error) { next(error); }
});

// Danh sách thành viên và yêu cầu chờ duyệt: Chủ nhiệm/Điều phối viên/Admin.
router.get('/:id/members', protect, clubManagerOnly, async (req, res, next) => {
  try {
    const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : undefined;
    const filter = { club: req.params.id, ...(status ? { status } : {}) };
    const memberships = await Membership.find(filter).populate('user', 'name email phone').populate('reviewedBy', 'name').sort({ status: 1, createdAt: -1 });
    res.json({ memberships });
  } catch (error) { next(error); }
});

// Ban chủ nhiệm thêm thành viên trực tiếp bằng email hoặc số điện thoại đã đăng ký.
router.post('/:id/members', protect, clubManagerOnly, async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || '').trim();
    if (!identifier) return res.status(400).json({ message: 'Vui lòng nhập email hoặc số điện thoại của tài khoản cần thêm.' });
    const isEmail = /^\S+@\S+\.\S+$/.test(identifier);
    const normalizedPhone = identifier.replace(/[\s()-]/g, '');
    if (!isEmail && !/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) return res.status(400).json({ message: 'Thông tin phải là email hợp lệ hoặc số điện thoại quốc tế, ví dụ +84901234567.' });
    const user = await User.findOne(isEmail ? { email: identifier.toLowerCase() } : { phone: normalizedPhone });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản. Người đó cần đăng ký ClubHub trước.' });
    if (String(user._id) === String(req.user._id)) return res.status(400).json({ message: 'Bạn đã có quyền quản lý CLB này.' });
    const role = req.user.role === 'admin' || req.clubMembership?.role === 'owner' ? (req.body.role === 'moderator' ? 'moderator' : 'member') : 'member';
    let membership = await Membership.findOne({ club: req.params.id, user: user._id });
    if (membership?.status === 'approved') return res.status(409).json({ message: 'Người dùng đã là thành viên.' });
    if (membership) {
      membership.status = 'approved'; membership.role = role; membership.reviewedBy = req.user._id; membership.reviewedAt = new Date();
      await membership.save();
    } else {
      membership = await Membership.create({ club: req.params.id, user: user._id, status: 'approved', role, reviewedBy: req.user._id, reviewedAt: new Date() });
    }
    await membership.populate('user', 'name email phone');
    res.status(201).json({ message: 'Đã thêm thành viên vào câu lạc bộ.', membership });
  } catch (error) { next(error); }
});

// Duyệt/từ chối yêu cầu hoặc thay đổi vai trò thành viên.
router.patch('/:id/members/:userId', protect, clubManagerOnly, async (req, res, next) => {
  try {
    const membership = await Membership.findOne({ club: req.params.id, user: req.params.userId });
    if (!membership) return res.status(404).json({ message: 'Không tìm thấy hồ sơ thành viên.' });
    if (membership.role === 'owner' && req.user.role !== 'admin') return res.status(403).json({ message: 'Không thể thay đổi quyền của Chủ nhiệm.' });
    const nextStatus = req.body.status;
    const nextRole = req.body.role;
    if (nextStatus && !['pending', 'approved', 'rejected'].includes(nextStatus)) return res.status(400).json({ message: 'Trạng thái thành viên không hợp lệ.' });
    if (nextRole && !['member', 'moderator'].includes(nextRole)) return res.status(400).json({ message: 'Vai trò không hợp lệ.' });
    if ((membership.role === 'moderator' || nextRole === 'moderator') && req.user.role !== 'admin' && req.clubMembership?.role !== 'owner') return res.status(403).json({ message: 'Chỉ Chủ nhiệm mới được bổ nhiệm hoặc hạ vai trò Điều phối viên.' });
    if (nextStatus) membership.status = nextStatus;
    if (nextRole) membership.role = nextRole;
    membership.reviewedBy = req.user._id;
    membership.reviewedAt = new Date();
    await membership.save();
    await membership.populate('user', 'name email phone');
    res.json({ message: 'Đã cập nhật thành viên.', membership });
  } catch (error) { next(error); }
});

router.delete('/:id/members/:userId', protect, clubManagerOnly, async (req, res, next) => {
  try {
    const membership = await Membership.findOne({ club: req.params.id, user: req.params.userId });
    if (!membership) return res.status(404).json({ message: 'Không tìm thấy thành viên.' });
    if (membership.role === 'owner') return res.status(400).json({ message: 'Không thể xóa Chủ nhiệm khỏi CLB.' });
    if (membership.role === 'moderator' && req.user.role !== 'admin' && req.clubMembership?.role !== 'owner') return res.status(403).json({ message: 'Chỉ Chủ nhiệm mới được xóa Điều phối viên.' });
    await membership.deleteOne();
    res.json({ message: 'Đã xóa thành viên khỏi câu lạc bộ.' });
  } catch (error) { next(error); }
});

router.post('/:id/transfer-ownership', protect, clubOwnerOnly, async (req, res, next) => {
  try {
    const newOwnerId = req.body.userId;
    if (!newOwnerId) return res.status(400).json({ message: 'Vui lòng chọn thành viên tiếp nhận quyền Chủ nhiệm.' });
    if (String(newOwnerId) === String(req.user._id)) return res.status(400).json({ message: 'Bạn đang là Chủ nhiệm của câu lạc bộ.' });
    const nextOwner = await Membership.findOne({ club: req.params.id, user: newOwnerId, status: 'approved' });
    if (!nextOwner) return res.status(404).json({ message: 'Người được chọn phải là thành viên chính thức của CLB.' });
    if (nextOwner.role === 'owner') return res.status(409).json({ message: 'Người này hiện đã là Chủ nhiệm.' });
    const currentOwner = await Membership.findOne({ club: req.params.id, status: 'approved', role: 'owner' });
    if (currentOwner) {
      currentOwner.role = 'moderator';
      currentOwner.reviewedBy = req.user._id;
      currentOwner.reviewedAt = new Date();
      await currentOwner.save();
    }
    nextOwner.role = 'owner';
    nextOwner.reviewedBy = req.user._id;
    nextOwner.reviewedAt = new Date();
    await nextOwner.save();
    await Club.findByIdAndUpdate(req.params.id, { createdBy: nextOwner.user });
    res.json({ message: 'Đã chuyển quyền Chủ nhiệm. Chủ nhiệm cũ hiện là Điều phối viên.' });
  } catch (error) { next(error); }
});

router.put('/:id', protect, clubOwnerOnly, async (req, res, next) => {
  try {
    const allowed = ['name', 'description', 'category', 'logo', 'cover', 'contactEmail', 'contactPhone', 'location', 'joinApprovalRequired', 'isActive'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const club = await Club.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!club) return res.status(404).json({ message: 'Không tìm thấy câu lạc bộ.' });
    res.json({ message: 'Đã cập nhật câu lạc bộ.', club });
  } catch (error) { next(error); }
});

router.delete('/:id', protect, clubOwnerOnly, async (req, res, next) => {
  try {
    const club = await Club.findByIdAndDelete(req.params.id);
    if (!club) return res.status(404).json({ message: 'Không tìm thấy câu lạc bộ.' });
    await Promise.all([Membership.deleteMany({ club: req.params.id }), Event.deleteMany({ club: req.params.id })]);
    res.json({ message: 'Đã xóa câu lạc bộ, sự kiện và hồ sơ thành viên liên quan.' });
  } catch (error) { next(error); }
});

export default router;
