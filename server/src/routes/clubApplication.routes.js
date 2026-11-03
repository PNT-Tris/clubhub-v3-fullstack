import { Router } from 'express';
import ClubApplication from '../models/ClubApplication.js';
import Club from '../models/Club.js';
import Membership from '../models/Membership.js';
import { protect, adminOnly } from '../middleware/auth.middleware.js';

const router = Router();
const emailPattern = /^\S+@\S+\.\S+$/;
const phonePattern = /^\+[1-9]\d{7,14}$/;

function validatePayload(body = {}) {
  const required = ['proposedName', 'category', 'description', 'mission', 'targetMembers', 'activityPlan', 'semesterPlan', 'contactEmail', 'contactPhone', 'location'];
  for (const key of required) if (!String(body[key] || '').trim()) return `Vui lòng nhập trường ${key}.`;
  if (String(body.proposedName).trim().length < 3) return 'Tên câu lạc bộ cần ít nhất 3 ký tự.';
  if (String(body.description).trim().length < 100) return 'Giới thiệu CLB cần ít nhất 100 ký tự.';
  if (String(body.mission).trim().length < 50) return 'Sứ mệnh cần ít nhất 50 ký tự.';
  if (String(body.targetMembers).trim().length < 20) return 'Đối tượng và quy mô thành viên cần ít nhất 20 ký tự.';
  if (String(body.activityPlan).trim().length < 120) return 'Kế hoạch hoạt động cần ít nhất 120 ký tự.';
  if (String(body.semesterPlan).trim().length < 80) return 'Kế hoạch học kỳ đầu cần ít nhất 80 ký tự.';
  if (String(body.governancePlan).trim().length < 80) return 'Kế hoạch tổ chức nhân sự cần ít nhất 80 ký tự.';
  if (String(body.budgetPlan).trim().length < 80) return 'Kế hoạch tài chính cần ít nhất 80 ký tự.';
  if (String(body.proposedName).trim().length > 100 || String(body.category).trim().length > 60 || String(body.description).trim().length > 2000 || String(body.mission).trim().length > 1500 || String(body.targetMembers).trim().length > 1000 || String(body.activityPlan).trim().length > 3000 || String(body.semesterPlan).trim().length > 2500 || String(body.governancePlan).trim().length > 2000 || String(body.budgetPlan).trim().length > 2000 || String(body.location).trim().length > 160) return 'Một hoặc nhiều trường vượt quá độ dài cho phép.';
  if (!emailPattern.test(String(body.contactEmail).trim())) return 'Email liên hệ không hợp lệ.';
  if (body.advisorEmail && !emailPattern.test(String(body.advisorEmail).trim())) return 'Email cố vấn không hợp lệ.';
  if (!phonePattern.test(String(body.contactPhone).trim())) return 'Số điện thoại liên hệ phải ở định dạng quốc tế, ví dụ +84901234567.';
  if (body.rulesAccepted !== true) return 'Bạn cần xác nhận cam kết tuân thủ quy định hoạt động.';
  if (!Array.isArray(body.foundingMembers) || body.foundingMembers.length < 5 || body.foundingMembers.length > 30) return 'Cần khai báo từ 5 đến 30 thành viên sáng lập.';
  const founderEmails = body.foundingMembers.map((item) => String((item || {}).email || '').trim().toLowerCase()).filter(Boolean);
  const founderPhones = body.foundingMembers.map((item) => String((item || {}).phone || '').trim()).filter(Boolean);
  if (new Set(founderEmails).size !== founderEmails.length) return 'Email của các thành viên sáng lập không được trùng nhau.';
  if (new Set(founderPhones).size !== founderPhones.length) return 'Số điện thoại của các thành viên sáng lập không được trùng nhau.';
  for (const [index, item] of body.foundingMembers.entries()) {
    const member = item || {};
    const email = String(member.email || '').trim();
    const phone = String(member.phone || '').trim();
    if (!String(member.name || '').trim() || !String(member.responsibility || '').trim() || (!email && !phone) || (email && !emailPattern.test(email)) || (phone && !phonePattern.test(phone)) || String(member.name || '').trim().length > 80 || String(member.responsibility || '').trim().length > 100) return `Thông tin người sáng lập thứ ${index + 1} chưa đầy đủ; cần tên, nhiệm vụ và ít nhất email hoặc số điện thoại hợp lệ.`;
  }
  return null;
}

// Người dùng đã đăng nhập gửi hồ sơ xin thành lập CLB.
router.post('/', protect, async (req, res, next) => {
  try {
    const body = req.body || {};
    const validationError = validatePayload(body);
    if (validationError) return res.status(400).json({ message: validationError });
    const proposedName = String(body.proposedName).trim();
    const applicantEmail = req.user.email && !req.user.email.endsWith('@phone.clubhub.invalid') ? req.user.email.toLowerCase() : '';
    const applicantPhone = String(req.user.phone || '').trim();
    const applicantListed = body.foundingMembers.some((item) => (applicantEmail && String(item.email || '').trim().toLowerCase() === applicantEmail) || (applicantPhone && String(item.phone || '').trim() === applicantPhone));
    if (!applicantListed) return res.status(400).json({ message: 'Người gửi hồ sơ phải xuất hiện trong đội ngũ sáng lập bằng email hoặc số điện thoại đã liên kết với tài khoản.' });
    const duplicateClub = await Club.findOne({ name: { $regex: `^${proposedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
    if (duplicateClub) return res.status(409).json({ message: 'Tên câu lạc bộ đã được sử dụng.' });
    const pending = await ClubApplication.findOne({ proposedName: { $regex: `^${proposedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, status: 'pending' });
    if (pending) return res.status(409).json({ message: 'Đã có hồ sơ đang chờ duyệt với tên câu lạc bộ này.' });
    const duplicatePendingByApplicant = await ClubApplication.findOne({ applicant: req.user._id, status: 'pending' });
    if (duplicatePendingByApplicant) return res.status(409).json({ message: 'Bạn đang có một hồ sơ thành lập CLB chờ xét duyệt.' });

    const safeFounders = body.foundingMembers.map((item) => ({ name: String(item.name).trim(), email: String(item.email || '').trim().toLowerCase(), phone: String(item.phone || '').trim(), responsibility: String(item.responsibility).trim() }));
    const application = await ClubApplication.create({
      applicant: req.user._id, proposedName, category: String(body.category).trim(),
      description: String(body.description).trim(), mission: String(body.mission).trim(),
      targetMembers: String(body.targetMembers).trim(), activityPlan: String(body.activityPlan).trim(),
      semesterPlan: String(body.semesterPlan).trim(), governancePlan: String(body.governancePlan).trim(),
      budgetPlan: String(body.budgetPlan).trim(), foundingMembers: safeFounders,
      contactEmail: String(body.contactEmail).trim().toLowerCase(), contactPhone: String(body.contactPhone).trim(),
      location: String(body.location).trim(), advisorName: String(body.advisorName || '').trim(),
      advisorEmail: String(body.advisorEmail || '').trim().toLowerCase(), rulesAccepted: true, status: 'pending'
    });
    res.status(201).json({ message: 'Đã gửi hồ sơ thành lập CLB. Vui lòng chờ quản trị viên hệ thống xét duyệt.', application });
  } catch (error) { next(error); }
});

router.get('/mine', protect, async (req, res, next) => {
  try {
    const applications = await ClubApplication.find({ applicant: req.user._id }).populate('createdClub', 'name').sort({ createdAt: -1 });
    res.json({ applications });
  } catch (error) { next(error); }
});

router.get('/admin', protect, adminOnly, async (req, res, next) => {
  try {
    const filter = {};
    if (['pending', 'processing', 'approved', 'rejected'].includes(req.query.status)) filter.status = req.query.status;
    const applications = await ClubApplication.find(filter)
      .populate('applicant', 'name email phone')
      .populate('reviewedBy', 'name email')
      .populate('createdClub', 'name')
      .sort({ createdAt: -1 });
    res.json({ applications });
  } catch (error) { next(error); }
});

router.patch('/:id/review', protect, adminOnly, async (req, res, next) => {
  let createdClubId = null;
  let claimedApplication = null;
  try {
    const { decision, reviewNote = '' } = req.body || {};
    const safeReviewNote = String(reviewNote || '').trim();
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Quyết định phải là approved hoặc rejected.' });
    if (safeReviewNote.length > 1500) return res.status(400).json({ message: 'Ghi chú xét duyệt không được vượt quá 1.500 ký tự.' });
    if (decision === 'rejected' && !safeReviewNote) return res.status(400).json({ message: 'Khi từ chối hồ sơ, Admin phải ghi rõ lý do.' });

    // Claim hồ sơ bằng cập nhật có điều kiện để hai Admin không duyệt cùng một hồ sơ đồng thời.
    claimedApplication = await ClubApplication.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'processing' } },
      { new: true }
    );
    if (!claimedApplication) {
      const existing = await ClubApplication.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Không tìm thấy hồ sơ thành lập CLB.' });
      return res.status(409).json({ message: 'Hồ sơ đã được xử lý hoặc đang được một quản trị viên khác xét duyệt.' });
    }

    if (decision === 'rejected') {
      claimedApplication.status = 'rejected';
      claimedApplication.reviewNote = safeReviewNote;
      claimedApplication.reviewedBy = req.user._id;
      claimedApplication.reviewedAt = new Date();
      await claimedApplication.save();
      return res.json({ message: 'Đã từ chối hồ sơ thành lập CLB.', application: claimedApplication });
    }

    const escapedName = claimedApplication.proposedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingClub = await Club.findOne({ name: { $regex: `^${escapedName}$`, $options: 'i' } });
    if (existingClub) {
      claimedApplication.status = 'pending';
      await claimedApplication.save();
      claimedApplication = null;
      return res.status(409).json({ message: 'Tên CLB đã được một hồ sơ khác đăng ký trước. Hãy yêu cầu người nộp đổi tên.' });
    }

    // Người nộp trở thành Chủ nhiệm của CLB vừa được duyệt; không thay đổi role hệ thống.
    const club = await Club.create({
      name: claimedApplication.proposedName,
      description: claimedApplication.description,
      mission: claimedApplication.mission,
      targetMembers: claimedApplication.targetMembers,
      activityPlan: claimedApplication.activityPlan,
      semesterPlan: claimedApplication.semesterPlan,
      governancePlan: claimedApplication.governancePlan,
      budgetPlan: claimedApplication.budgetPlan,
      foundingMembers: claimedApplication.foundingMembers,
      advisorName: claimedApplication.advisorName,
      advisorEmail: claimedApplication.advisorEmail,
      category: claimedApplication.category,
      contactEmail: claimedApplication.contactEmail,
      contactPhone: claimedApplication.contactPhone,
      location: claimedApplication.location,
      joinApprovalRequired: true,
      createdBy: claimedApplication.applicant,
      isActive: true
    });
    createdClubId = club._id;
    await Membership.findOneAndUpdate(
      { club: club._id, user: claimedApplication.applicant },
      { $set: { status: 'approved', role: 'owner', reviewedBy: req.user._id, reviewedAt: new Date() }, $setOnInsert: { requestedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    claimedApplication.status = 'approved';
    claimedApplication.reviewNote = safeReviewNote;
    claimedApplication.reviewedBy = req.user._id;
    claimedApplication.reviewedAt = new Date();
    claimedApplication.createdClub = club._id;
    await claimedApplication.save();
    res.json({ message: 'Đã duyệt hồ sơ, tạo câu lạc bộ và bổ nhiệm người nộp hồ sơ làm Chủ nhiệm.', application: claimedApplication, club });
  } catch (error) {
    // Bù trừ thao tác nếu một bước tạo CLB/Chủ nhiệm/lưu hồ sơ thất bại.
    if (createdClubId) {
      await Promise.all([
        Club.findByIdAndDelete(createdClubId),
        Membership.deleteOne({ club: createdClubId })
      ]).catch(() => {});
    }
    if (claimedApplication) {
      await ClubApplication.updateOne({ _id: claimedApplication._id, status: 'processing' }, { $set: { status: 'pending' } }).catch(() => {});
    }
    next(error);
  }
});

export default router;
