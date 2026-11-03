import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Membership from '../models/Membership.js';

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Bạn cần đăng nhập để thực hiện thao tác này.' });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET chưa được cấu hình.');
    const payload = jwt.verify(header.slice(7), secret);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Tài khoản không còn tồn tại.' });
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: error.name === 'TokenExpiredError' ? 'Phiên đăng nhập đã hết hạn.' : 'Token không hợp lệ. Vui lòng đăng nhập lại.' });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Chức năng chỉ dành cho quản trị viên hệ thống.' });
  return next();
}

export async function clubManagerOnly(req, res, next) {
  try {
    if (req.user?.role === 'admin') return next();
    const membership = await Membership.findOne({
      club: req.params.id,
      user: req.user._id,
      status: 'approved',
      role: { $in: ['owner', 'moderator'] }
    });
    if (!membership) return res.status(403).json({ message: 'Bạn cần là Chủ nhiệm hoặc Điều phối viên của CLB để thực hiện thao tác này.' });
    req.clubMembership = membership;
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function clubOwnerOnly(req, res, next) {
  try {
    if (req.user?.role === 'admin') return next();
    const membership = await Membership.findOne({ club: req.params.id, user: req.user._id, status: 'approved', role: 'owner' });
    if (!membership) return res.status(403).json({ message: 'Chỉ Chủ nhiệm CLB hoặc quản trị viên hệ thống mới được thực hiện thao tác này.' });
    req.clubMembership = membership;
    return next();
  } catch (error) { return next(error); }
}
