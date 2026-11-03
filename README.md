# ClubHub – Nền tảng quản lý câu lạc bộ và sự kiện

ClubHub là ứng dụng web Fullstack dành cho môi trường câu lạc bộ sinh viên. Dự án bám theo đề tài **Câu lạc bộ và sự kiện** trong BTL: tạo và quản lý sự kiện, đăng ký tham gia, quản lý thành viên và điểm danh.

## Tài liệu trong dự án

- `docs/BAO_CAO_RA_SOAT.md`: lỗi bản đầu, thay đổi đã thực hiện và trạng thái kiểm thử.
- `docs/GIAI_THICH_CAU_TRUC.md`: giải thích từng file, các lệnh quan trọng và luồng nghiệp vụ để ôn tập/bảo vệ.
- `docs/QUY_TRINH_THANH_LAP_CLB.md`: điều kiện, luồng phê duyệt và phân quyền thành lập CLB.
- `docs/CAU_HINH_DANG_NHAP.md`: hướng dẫn cấu hình Google, Facebook và SMS OTP.
- `docs/KICH_BAN_KIEM_THU.md`: checklist kiểm thử đăng nhập, thành lập CLB, phân quyền và sự kiện.

## 1. Công nghệ

- **Frontend:** React 18, Vite, React Router, Zustand, Context API, Lucide Icons.
- **Backend:** Node.js, Express 4, REST API, middleware xác thực và xử lý lỗi.
- **Database:** MongoDB, Mongoose.
- **Bảo mật:** bcryptjs hash mật khẩu, JWT, Google Auth Library xác minh Google ID token, phân quyền quản trị viên hệ thống và vai trò trong từng CLB, Helmet, rate limit cho API xác thực.

## 2. Chức năng đã triển khai

### Khách (Guest)
- Xem trang chủ, danh sách CLB và sự kiện công khai.
- Tìm kiếm, lọc CLB/sự kiện.
- Xem chi tiết CLB, sự kiện.

### Thành viên (Member)
- Đăng ký/đăng nhập bằng email và mật khẩu, Google, Facebook hoặc số điện thoại xác minh OTP.
- Hiện/ẩn mật khẩu bằng nút con mắt; liên kết thêm Google/Facebook/số điện thoại tại Hồ sơ cá nhân.
- Gửi yêu cầu tham gia CLB.
- Xem trạng thái yêu cầu: chờ duyệt, đã tham gia, bị từ chối.
- Rút yêu cầu hoặc rời CLB (trừ Chủ nhiệm).
- Đăng ký/hủy đăng ký sự kiện; hệ thống kiểm tra sự kiện đã bắt đầu, trùng đăng ký và sức chứa.
- Theo dõi CLB và sự kiện đã đăng ký trong **Hoạt động của tôi**.
- Cập nhật tên hiển thị trong hồ sơ.

### Chủ nhiệm / Điều phối viên CLB
- Xem danh sách thành viên và yêu cầu tham gia.
- Duyệt hoặc từ chối yêu cầu.
- Thêm thành viên bằng email hoặc số điện thoại đã đăng ký (tài khoản phải tồn tại trước). Danh sách điểm danh hỗ trợ cả tài khoản phone-only.
- Bổ nhiệm/hạ vai trò Điều phối viên (Chủ nhiệm mới được bổ nhiệm).
- Xóa thành viên khỏi CLB.
- Chuyển quyền Chủ nhiệm cho một thành viên chính thức; Chủ nhiệm cũ chuyển thành Điều phối viên.
- Tạo, sửa và xóa sự kiện của CLB.
- Xem danh sách đăng ký và cập nhật điểm danh sự kiện.

### Quản trị viên hệ thống (Admin / người sáng lập website)
- Dashboard thống kê.
- Xem, phê duyệt hoặc từ chối hồ sơ thành lập CLB; ghi chú lý do xét duyệt.
- Sau khi duyệt, hệ thống tạo CLB và tự gán người đề xuất làm Chủ nhiệm.
- Sửa/ẩn/hiện/xóa các CLB hiện có; không tạo CLB trực tiếp ngoài quy trình hồ sơ.
- CRUD sự kiện toàn nền tảng, quản lý thành viên CLB với quyền quản trị hệ thống.

## 3. Mô hình dữ liệu

| Collection | Vai trò | Quan hệ chính |
|---|---|---|
| `users` | Tài khoản, email, mật khẩu đã hash, role hệ thống | Một user có nhiều membership và registration |
| `clubs` | Thông tin CLB, người tạo, cấu hình duyệt thành viên | Liên kết với User qua `createdBy` |
| `memberships` | Hồ sơ tham gia CLB, trạng thái, vai trò trong CLB | Liên kết `club` và `user`; unique theo cặp này |
| `events` | Sự kiện, thời gian, sức chứa, CLB tổ chức | Liên kết `club`, `createdBy`; chứa đăng ký tham gia |
| `clubapplications` | Hồ sơ đề xuất thành lập CLB, đội ngũ sáng lập, kế hoạch và trạng thái xét duyệt | Liên kết `applicant`, `reviewedBy`, `createdClub` |

`memberships` được tách riêng để lưu được cả yêu cầu chờ duyệt, từ chối, thành viên chính thức và vai trò Chủ nhiệm/Điều phối viên/Thành viên. Đây là phần nghiệp vụ bổ sung quan trọng so với mô hình ban đầu chỉ lưu một mảng thành viên đơn giản trong Club.

## 4. Phân quyền

| Nghiệp vụ | Guest | Member | Chủ nhiệm/Điều phối viên | Admin |
|---|---:|---:|---:|---:|
| Xem CLB/sự kiện công khai | ✓ | ✓ | ✓ | ✓ |
| Gửi yêu cầu tham gia CLB |  | ✓ | ✓ | ✓ |
| Duyệt/từ chối thành viên |  |  | ✓ | ✓ |
| Thêm/xóa thành viên |  |  | ✓ | ✓ |
| Tạo/sửa/xóa sự kiện trong CLB |  |  | ✓ | ✓ |
| Đăng ký sự kiện |  | ✓ | ✓ | ✓ |
| Điểm danh |  |  | ✓ | ✓ |
| Gửi hồ sơ thành lập CLB |  | ✓ | ✓ | ✓ |
| Duyệt hồ sơ thành lập CLB |  |  |  | ✓ |
| Sửa/xóa CLB sau khi thành lập |  |  | Chủ nhiệm CLB của mình | ✓ |
| Dashboard hệ thống |  |  |  | ✓ |

## 5. Cài đặt trên Windows / VS Code

### Yêu cầu
- Node.js 22.12+ (khuyến nghị 22 LTS) hoặc Node.js 20.19+ và npm. Vite 8 yêu cầu một trong các phiên bản này.
- MongoDB Community Server đang chạy hoặc MongoDB Atlas URI.

### Bước 1 – Cấu hình backend
Mở Terminal thứ nhất tại thư mục `server`:

```powershell
cd server
Copy-Item .env.example .env
```

Mở `server/.env`, cấu hình `MONGODB_URI` và đặt `JWT_SECRET` là chuỗi bí mật ngẫu nhiên dài ít nhất 32 ký tự. Có thể dùng `SEED_ADMIN_EMAIL` và `SEED_ADMIN_PASSWORD` để đặt tài khoản demo.

Cài dependencies:

```powershell
npm.cmd install
```

Tạo tài khoản Admin và dữ liệu mẫu:

```powershell
npm.cmd run seed
```

Kiểm tra cú pháp JavaScript backend (không cần kết nối MongoDB):

```powershell
npm.cmd run check
```

Chạy backend:

```powershell
npm.cmd run dev
```

Kiểm tra API bằng trình duyệt: `http://localhost:5000/api/health`.

### Bước 2 – Cấu hình frontend
Mở Terminal thứ hai tại thư mục gốc dự án:

```powershell
cd client
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

Mở địa chỉ Vite hiển thị trong Terminal (mặc định `http://localhost:5173`).

> Trên Windows PowerShell, dùng `npm.cmd` thay cho `npm` nếu gặp lỗi `npm.ps1 cannot be loaded because running scripts is disabled`. Đây là cách chạy trực tiếp npm.cmd mà không cần thay đổi Execution Policy của Windows.

### Tài khoản Admin mặc định khi tạo mới bằng file `.env.example`
- Email: `admin@clubhub.local`
- Mật khẩu: `ChangeThisStrongPassword123!`

Thông tin mặc định chỉ áp dụng lần đầu tạo Admin. Nếu Admin đã tồn tại, seed giữ nguyên mật khẩu cũ và không thể khôi phục mật khẩu hiện tại. Nếu email đó đang thuộc tài khoản thường, seed dừng lại và không tự nâng quyền tài khoản. Đổi mật khẩu/tài khoản demo trước khi deploy. Seed cũng không ghi đè Chủ nhiệm đã được chuyển giao của các CLB mẫu khi chạy lại.

## 6. REST API

### Authentication
| Method | Endpoint | Ý nghĩa |
|---|---|---|
| POST | `/api/auth/register` | Tạo tài khoản |
| POST | `/api/auth/login` | Đăng nhập email/mật khẩu và cấp JWT |
| POST | `/api/auth/google` | Đăng nhập Google bằng ID token đã xác minh |
| POST | `/api/auth/facebook` | Đăng nhập Facebook bằng access token đã xác minh |
| POST | `/api/auth/phone/send-otp` | Gửi OTP SMS qua Twilio Verify |
| POST | `/api/auth/phone/verify-otp` | Xác minh OTP và đăng nhập/tạo tài khoản |
| POST | `/api/auth/google/link` | Liên kết Google vào tài khoản hiện tại |
| POST | `/api/auth/facebook/link` | Liên kết Facebook vào tài khoản hiện tại |
| POST | `/api/auth/phone/link/send-otp` | Gửi OTP liên kết số điện thoại |
| POST | `/api/auth/phone/link/verify-otp` | Xác minh và liên kết số điện thoại |
| GET | `/api/auth/me` | Lấy tài khoản hiện tại |
| PATCH | `/api/auth/me` | Cập nhật tên hồ sơ |
| GET | `/api/auth/me/summary` | Tổng quan thành viên và sự kiện sắp tới |

### Hồ sơ thành lập câu lạc bộ
| Method | Endpoint | Ý nghĩa |
|---|---|---|
| POST | `/api/club-applications` | Thành viên gửi hồ sơ thành lập CLB |
| GET | `/api/club-applications/mine` | Xem hồ sơ thành lập của tài khoản hiện tại |
| GET | `/api/club-applications/admin?status=pending` | Admin website xem hồ sơ chờ duyệt |
| PATCH | `/api/club-applications/:id/review` | Admin phê duyệt/từ chối; phê duyệt sẽ tạo CLB và gán người nộp làm Chủ nhiệm |

### Clubs / Memberships
| Method | Endpoint | Ý nghĩa |
|---|---|---|
| GET | `/api/clubs` | Danh sách CLB, tìm kiếm, lọc, phân trang |
| POST | `/api/clubs` | Trả 409: CLB mới phải đi qua quy trình hồ sơ thành lập |
| GET | `/api/clubs/manage/all` | Tất cả CLB cho Admin |
| GET | `/api/clubs/:id` | Chi tiết CLB |
| PUT | `/api/clubs/:id` | Sửa CLB (Chủ nhiệm/Admin) |
| DELETE | `/api/clubs/:id` | Xóa CLB, membership và sự kiện liên quan |
| GET | `/api/clubs/mine/memberships` | CLB/yêu cầu tham gia của tôi |
| GET | `/api/clubs/:id/membership/me` | Trạng thái tham gia của tôi tại CLB |
| POST | `/api/clubs/:id/join` | Gửi yêu cầu tham gia hoặc tham gia trực tiếp nếu CLB không yêu cầu duyệt |
| DELETE | `/api/clubs/:id/membership` | Rút yêu cầu hoặc rời CLB |
| GET | `/api/clubs/:id/members` | Danh sách thành viên/yêu cầu (Ban chủ nhiệm) |
| POST | `/api/clubs/:id/members` | Thêm tài khoản bằng email hoặc số điện thoại (Ban chủ nhiệm) |
| PATCH | `/api/clubs/:id/members/:userId` | Duyệt/từ chối/đổi vai trò |
| DELETE | `/api/clubs/:id/members/:userId` | Xóa thành viên |
| POST | `/api/clubs/:id/transfer-ownership` | Chuyển quyền Chủ nhiệm cho thành viên chính thức |

### Events / Attendance
| Method | Endpoint | Ý nghĩa |
|---|---|---|
| GET | `/api/events` | Sự kiện công khai; hỗ trợ lọc CLB/danh mục/từ khóa |
| POST | `/api/events` | Tạo sự kiện (Admin hoặc Ban chủ nhiệm/Điều phối viên CLB) |
| GET | `/api/events/manage/all` | Sự kiện được phép quản lý |
| GET | `/api/events/club/:clubId/manage` | Sự kiện thuộc CLB được quản lý |
| GET | `/api/events/:id` | Chi tiết sự kiện |
| PUT | `/api/events/:id` | Sửa sự kiện (người có quyền quản lý CLB) |
| DELETE | `/api/events/:id` | Xóa sự kiện (người có quyền quản lý CLB) |
| GET | `/api/events/mine/registrations` | Sự kiện tôi đã đăng ký |
| GET | `/api/events/:id/registration/me` | Kiểm tra đăng ký của tôi |
| POST | `/api/events/:id/register` | Đăng ký tham gia |
| DELETE | `/api/events/:id/register` | Hủy đăng ký |
| GET | `/api/events/:id/registrations` | Danh sách người đăng ký (Ban chủ nhiệm/Admin) |
| PATCH | `/api/events/:id/attendance/:userId` | Cập nhật điểm danh |

### Dashboard
| Method | Endpoint | Ý nghĩa |
|---|---|---|
| GET | `/api/dashboard/stats` | Thống kê tổng quan (Admin) |
| GET | `/api/dashboard/recent` | Dữ liệu gần đây (Admin) |

## 7. Mã trạng thái HTTP

- `200`: thao tác thành công.
- `201`: tạo tài khoản, membership hoặc sự kiện thành công.
- `400`: dữ liệu đầu vào không hợp lệ hoặc nghiệp vụ không cho phép.
- `401`: chưa đăng nhập hoặc JWT không hợp lệ/hết hạn.
- `403`: đã đăng nhập nhưng không đủ quyền.
- `404`: không tìm thấy dữ liệu.
- `409`: email trùng, đã gửi yêu cầu, đã đăng ký hoặc sự kiện đủ chỗ.
- `500`: lỗi máy chủ; response không trả stack trace cho trình duyệt.

## 8. Git và bảo mật

- Không commit `.env`, `node_modules`, `dist` hoặc thông tin bí mật.
- Commit theo từng chức năng: Auth, Membership, Club CRUD, Event CRUD, Attendance, UI.
- JWT secret và thông tin kết nối MongoDB chỉ lưu trong biến môi trường.
- Mật khẩu được hash bằng bcryptjs; API quản trị yêu cầu JWT và role phù hợp.
- Đây là nền tảng phục vụ bài tập lớn. Trước triển khai thật cần bổ sung kiểm thử tự động, logging/monitoring, quy trình đổi mật khẩu, xác thực email, upload ảnh có kiểm soát, chính sách lưu dữ liệu và kiểm tra tải.

## 9. Giới hạn cần biết

- Thành viên chỉ có thể được Ban chủ nhiệm thêm bằng email hoặc số điện thoại đã liên kết với tài khoản ClubHub. Tài khoản đó phải tồn tại trước.
- Seed tạo Admin, 4 CLB và 4 sự kiện mẫu; không tạo sẵn tài khoản sinh viên. Hãy đăng ký tài khoản Member mới để thử luồng gửi yêu cầu tham gia.
- QR check-in, upload ảnh thật, email thông báo và deploy chưa nằm trong phiên bản này. Google/Facebook/Twilio cần credentials riêng; xem `docs/CAU_HINH_DANG_NHAP.md`.

## 10. Quy trình demo các nghiệp vụ chính

1. Chạy `npm.cmd run seed` trong `server` để có tài khoản Admin, 4 CLB mẫu và 4 sự kiện tương lai.
2. Đăng nhập Admin. Mọi CLB mới phải được người dùng gửi hồ sơ và Admin duyệt tại **Quản trị → Hồ sơ thành lập**. Admin có thể sửa/ẩn/xóa CLB đã có; vào **Quản trị → Sự kiện** để tạo/sửa/xóa sự kiện.
3. Mở cửa sổ trình duyệt ẩn danh hoặc trình duyệt khác, đăng ký một tài khoản Member.
4. Member mở một CLB mẫu, bấm **Đăng ký tham gia CLB**. Trạng thái ban đầu là **Chờ duyệt**.
5. Đăng nhập Admin ở cửa sổ ban đầu, mở cùng CLB → **Quản lý thành viên** → bấm duyệt. Có thể thêm tài khoản khác bằng email/số điện thoại, bổ nhiệm Điều phối viên hoặc xóa thành viên.
6. Member tải lại trang CLB sẽ thấy trạng thái **Thành viên**. Member có thể mở sự kiện và đăng ký; sự kiện giới hạn thành viên chỉ cho phép tài khoản có membership `approved` đăng ký.
7. Admin/Chủ nhiệm/Điều phối viên mở chi tiết sự kiện để xem danh sách đăng ký và cập nhật điểm danh. Member theo dõi kết quả trong **Hoạt động của tôi**.

Dùng hai profile trình duyệt riêng giúp kiểm thử đồng thời vai trò Admin và Member vì token được lưu trong `localStorage` của từng profile.

## 11. Cấu hình đăng nhập ngoài (Google, Facebook, SMS)

Các provider đã có endpoint và giao diện, nhưng không thể hoạt động thực tế chỉ bằng cách tải source code. Hãy tự tạo credentials và cấu hình theo `docs/CAU_HINH_DANG_NHAP.md`. Giữ App Secret, Twilio Auth Token và JWT Secret ở server; tuyệt đối không đặt chúng trong biến `VITE_` hoặc commit `.env`.

## 12. Gợi ý phân công nhóm 3–4 người theo đúng chức năng Fullstack

- **Thành viên 1 – Tài khoản và hồ sơ:** đăng ký/đăng nhập, JWT, bcrypt, AuthContext, cập nhật hồ sơ; trình bày cả màn hình và API Auth.
- **Thành viên 2 – Câu lạc bộ và membership:** CRUD CLB, gửi yêu cầu tham gia, rút yêu cầu, duyệt/từ chối, thêm/xóa thành viên, vai trò trong CLB; trình bày React + API + Membership/Club schema.
- **Thành viên 3 – Sự kiện và đăng ký:** CRUD sự kiện, tìm kiếm/lọc, đăng ký/hủy, kiểm tra sức chứa và điều kiện membership; trình bày React + Event API + Event schema.
- **Thành viên 4 – Điểm danh và quản trị:** danh sách người đăng ký, điểm danh, dashboard thống kê, kiểm thử quy trình và README; trình bày màn hình quản trị + API + aggregation MongoDB.

Mỗi thành viên nên tạo nhánh riêng, commit theo chức năng mình hoàn thành và ghi rõ file/API phụ trách trong báo cáo. Không chia nhóm cứng thành “chỉ frontend” và “chỉ backend”, vì yêu cầu BTL là mỗi người giải thích được phần chức năng của mình xuyên suốt giao diện, API và dữ liệu.

---

## ClubHub V3 – Xác thực đa phương thức và quy trình thành lập CLB

### Phân quyền
- **Admin toàn website (`User.role = admin`)**: tài khoản người sáng lập nền tảng / quản trị viên hệ thống. Được truy cập Dashboard và duyệt hồ sơ thành lập CLB.
- **Chủ nhiệm / Admin CLB (`Membership.role = owner`)**: người đứng tên đề xuất CLB; sau khi hồ sơ được Admin website phê duyệt, hệ thống tự tạo CLB và cấp quyền quản trị trong đúng CLB đó.
- **Điều phối viên (`Membership.role = moderator`)**: quản lý tác vụ được phân quyền trong CLB.
- **Thành viên (`Membership.role = member`)**: tham gia sự kiện và hoạt động của CLB.

Người đề xuất CLB **không** được nâng thành Admin toàn website. Quyền hệ thống và quyền trong từng CLB được lưu riêng.

### Quy trình xin thành lập CLB
1. Người dùng đăng nhập và mở `/club-applications/new` hoặc bấm “Đề xuất thành lập CLB” ở trang Câu lạc bộ.
2. Điền tên, lĩnh vực, giới thiệu, sứ mệnh, đối tượng thành viên, kế hoạch hoạt động, kế hoạch học kỳ đầu, tối thiểu 5 người sáng lập, email/số điện thoại liên hệ và cam kết tuân thủ.
3. API `POST /api/club-applications` xác thực dữ liệu, kiểm tra tên trùng và lưu hồ sơ ở trạng thái `pending`.
4. Admin website mở Dashboard → Hồ sơ thành lập, xem toàn bộ thông tin và phê duyệt/từ chối kèm ghi chú.
5. Khi phê duyệt, backend tạo Club, tạo Membership cho người nộp với `status=approved`, `role=owner` và ghi nhận người duyệt. Vai trò website của người nộp vẫn là `member`.
6. Người nộp theo dõi kết quả ở `/my-club-applications`.

Điều kiện được kiểm tra ở cả frontend và backend: tên từ 3 ký tự; giới thiệu tối thiểu 100 ký tự; sứ mệnh tối thiểu 50 ký tự; đối tượng thành viên tối thiểu 20 ký tự; kế hoạch hoạt động tối thiểu 120 ký tự; kế hoạch học kỳ đầu tối thiểu 80 ký tự; kế hoạch tổ chức nhân sự và kế hoạch tài chính tối thiểu 80 ký tự mỗi mục; 5–30 người sáng lập với họ tên, nhiệm vụ và ít nhất một phương thức liên hệ email/số điện thoại; người nộp phải xuất hiện trong danh sách bằng email hoặc số điện thoại đã gắn với tài khoản; email liên hệ hợp lệ; số điện thoại quốc tế E.164 (ví dụ `+84901234567`); và tick cam kết hoạt động hợp lệ. Thông tin cố vấn là tùy chọn.

### Đăng nhập và liên kết tài khoản
- **Email/mật khẩu**: đăng ký và đăng nhập truyền thống; bcrypt lưu password hash.
- **Google**: frontend Google Identity Services nhận ID token; backend xác minh token với Google, kiểm tra đúng `GOOGLE_CLIENT_ID` và email đã xác minh. Tài khoản mới được tạo khi chưa có danh tính Google tương ứng. Nếu email đã có tài khoản mật khẩu nhưng email chưa xác minh, người dùng phải đăng nhập tài khoản đó trước rồi chủ động liên kết Google trong Hồ sơ để tránh chiếm quyền tài khoản bằng email chưa xác minh.
- **Facebook**: frontend Facebook SDK nhận access token; backend xác minh token qua Graph API v26.0, kiểm tra đúng Facebook App ID và lấy hồ sơ có email. Cần cấp quyền `public_profile,email`.
- **Số điện thoại**: gửi OTP SMS qua Twilio Verify; chỉ tạo tài khoản/đăng nhập sau khi Twilio trả trạng thái `approved`. Trong trang Hồ sơ, người dùng đã đăng nhập cũng có thể liên kết số điện thoại bằng OTP. Tài khoản phone-only dùng email nội bộ `.invalid` không hiển thị cho người dùng; khi liên kết Google/Facebook thành công, email xác minh sẽ thay thế email nội bộ.
- **Hiện/ẩn mật khẩu**: nút con mắt ở trường mật khẩu trên trang xác thực.

### Cấu hình nhà cung cấp xác thực
1. Copy `server/.env.example` thành `server/.env`; copy `client/.env.example` thành `client/.env`.
2. Google: tạo OAuth 2.0 Client ID loại Web trong Google Cloud Console; khai báo `http://localhost:5173` trong Authorized JavaScript origins. Đặt cùng Client ID vào `GOOGLE_CLIENT_ID` ở server và `VITE_GOOGLE_CLIENT_ID` ở client.
3. Facebook: tạo ứng dụng tại Meta for Developers, bật Facebook Login, thêm `localhost` vào App Domains và `http://localhost:5173` vào Valid OAuth Redirect URIs nếu dashboard yêu cầu. Đặt App ID ở cả `FACEBOOK_APP_ID` và `VITE_FACEBOOK_APP_ID`; App Secret chỉ đặt ở server.
4. SMS: tạo Twilio Verify Service, đặt `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` ở server. Số điện thoại nhập theo chuẩn E.164. Tài khoản Twilio thử nghiệm chỉ gửi được tới số đã xác minh trong Twilio.
5. Khởi động lại cả frontend và backend sau khi thay đổi file `.env`.

Nếu không cấu hình credentials, các nút Google/Facebook hiển thị trạng thái chưa cấu hình và API SMS trả về lỗi 503 có giải thích. Không có OTP giả hoặc đăng nhập giả lập.

### API bổ sung V3
- `POST /api/auth/google` – xác minh Google ID token.
- `POST /api/auth/facebook` – xác minh Facebook access token.
- `POST /api/auth/phone/send-otp` – gửi mã OTP SMS.
- `POST /api/auth/phone/verify-otp` – xác minh OTP và đăng nhập/tạo tài khoản.
- `POST /api/auth/phone/link/send-otp` – gửi OTP liên kết số điện thoại vào tài khoản đang đăng nhập.
- `POST /api/auth/phone/link/verify-otp` – xác minh và liên kết số điện thoại.
- `POST /api/auth/google/link` và `/api/auth/facebook/link` – liên kết nhà cung cấp xã hội vào tài khoản hiện tại.
- `POST /api/club-applications` – gửi hồ sơ xin thành lập CLB.
- `GET /api/club-applications/mine` – xem hồ sơ của bản thân.
- `GET /api/club-applications/admin?status=pending` – Admin xem hồ sơ theo trạng thái.
- `PATCH /api/club-applications/:id/review` – Admin phê duyệt/từ chối hồ sơ.
- `POST /api/clubs` – không còn tạo CLB trực tiếp; trả 409 và yêu cầu qua quy trình hồ sơ.

### Bảo mật và vận hành
- Không đưa `FACEBOOK_APP_SECRET`, `TWILIO_AUTH_TOKEN`, `JWT_SECRET` lên frontend hoặc Git.
- Dùng HTTPS ở production; cấu hình đúng CORS và domain OAuth.
- Thay mật khẩu tài khoản seed, không dùng `admin@clubhub.local` khi deploy công khai.
- Các nút OAuth/SMS chỉ hoạt động sau khi cấu hình thông tin nhà cung cấp hợp lệ.
- Tài khoản Google/Facebook mới được tạo từ provider đã xác minh. Với tài khoản mật khẩu chưa có xác minh email hoặc tài khoản phone-only, người dùng đăng nhập vào tài khoản hiện tại rồi chủ động liên kết provider ở Hồ sơ. Điều này tránh tự động ghép tài khoản chỉ dựa trên email do người đăng ký chưa xác minh khai báo. Không cho client tự gửi `role`.
- Meta Graph API được đặt ở v26.0 trong mã nguồn; kiểm tra và cập nhật phiên bản định kỳ theo lịch sunset của Meta.
