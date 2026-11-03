# Báo cáo rà soát và nâng cấp ClubHub

## 1. Phạm vi đối chiếu

Đề bài BTL yêu cầu ứng dụng Fullstack dùng React + Vite + React Router, tối thiểu 6 màn hình responsive, Context cho đăng nhập, Redux Toolkit hoặc Zustand, Express REST API, middleware xử lý lỗi, MongoDB + Mongoose tối thiểu 3 collection có quan hệ, Git/README; JWT, bcrypt, phân quyền và deploy là phần nâng cao.

ClubHub V3 hiện có 5 collection: `users`, `clubs`, `memberships`, `events`, `clubapplications`.

## 2. Những thiếu sót của bản source ban đầu

1. Nút **Tham gia câu lạc bộ** ở `ClubDetail.jsx` chỉ hiển thị một thông báo, không gửi request tới backend.
2. Backend không có collection hoặc endpoint lưu yêu cầu gia nhập CLB; không có trạng thái chờ duyệt/đã duyệt/từ chối.
3. Không có API để Ban chủ nhiệm xem danh sách thành viên, duyệt yêu cầu, thêm thành viên bằng email hoặc xóa thành viên.
4. Trường `members` trong Club model không được sử dụng bởi một nghiệp vụ thực tế và không thể lưu vòng đời yêu cầu tham gia.
5. Dashboard chỉ có vài con số thống kê, không có form CRUD CLB/sự kiện mặc dù một số route CRUD đã có.
6. Hồ sơ cá nhân chỉ hiển thị thông tin tĩnh; chưa có hoạt động CLB và lịch sử đăng ký sự kiện.
7. Trang sự kiện chưa truy vấn trạng thái đăng ký cá nhân; chưa có thao tác hủy đăng ký/điểm danh hoàn chỉnh trên giao diện.
8. README cũ nhắc seed script nhưng source chưa có script seed.
9. Vite config chưa khai báo React plugin; CSS có lỗi cú pháp ở biến màu `--line`.
10. Cấu hình API frontend gắn cứng URL, chưa hỗ trợ `VITE_API_URL`.

## 3. Những nội dung đã sửa

### Quản lý thành viên CLB

- Tạo model `Membership.js` riêng, liên kết `club` và `user` bằng ObjectId.
- Có `status`: `pending`, `approved`, `rejected`.
- Có `role`: `owner`, `moderator`, `member`.
- Tạo unique index để một user không có hai membership trong cùng CLB; thêm partial unique index để một CLB chỉ có một Chủ nhiệm đang được duyệt.
- Người dùng gửi yêu cầu, rút yêu cầu hoặc rời CLB.
- Chủ nhiệm/Điều phối viên/Admin xem danh sách, duyệt, từ chối, thêm bằng email hoặc số điện thoại, xóa thành viên.
- Chủ nhiệm/Admin có thể chuyển quyền Chủ nhiệm cho một thành viên đã được duyệt; Chủ nhiệm cũ trở thành Điều phối viên. Seed được làm idempotent để chạy lại không chiếm lại quyền Chủ nhiệm đã chuyển giao; không tự nâng role tài khoản thường trùng email Admin để tránh rủi ro chiếm quyền.
- Chỉ Chủ nhiệm/Admin mới được bổ nhiệm hoặc hạ vai trò Điều phối viên; Điều phối viên không thể tự ý thay đổi quyền của Điều phối viên khác.
- Số lượng thành viên được tính từ Membership có trạng thái `approved`, không dựa vào dữ liệu mảng chưa được sử dụng.

### Quản lý sự kiện

- CRUD sự kiện có kiểm tra quyền theo CLB.
- Đăng ký và hủy đăng ký.
- Kiểm tra sự kiện đã bắt đầu, sự kiện đã đóng đăng ký, đăng ký trùng và sức chứa.
- Cập nhật lượt đăng ký bằng điều kiện MongoDB để hạn chế vượt sức chứa khi có nhiều request đồng thời.
- Sự kiện có thể yêu cầu người đăng ký phải là thành viên CLB đã được duyệt.
- Người có quyền quản lý xem danh sách đăng ký và cập nhật điểm danh.

### Giao diện

- Bổ sung trang Hoạt động của tôi.
- Trang chi tiết CLB có trạng thái tham gia, chức năng thành viên và quản lý sự kiện.
- Dashboard Admin có tab Tổng quan, Hồ sơ thành lập, Câu lạc bộ và Sự kiện; hỗ trợ tạo, sửa, xóa, ẩn/hiện CLB; tạo, sửa, xóa và đổi trạng thái sự kiện.
- Trang cá nhân cho phép cập nhật tên.
- Thêm `.env.example`, Vite config, dữ liệu mẫu và tài liệu hướng dẫn.
- Sửa CSS và bổ sung responsive cho form/roster/dashboard.

## 4. Kiểm tra đã thực hiện trong môi trường xây dựng

- `node --check` cho 16 file JavaScript backend: đạt.
- TypeScript parser/transpiler kiểm tra 19 file JavaScript/JSX trong `client/src` cùng `client/vite.config.js` (tổng 20 file): đạt, không có lỗi parse.
- Rà soát 52 import tương đối trong frontend: không có đường dẫn thiếu.
- Kiểm tra cú pháp JSON của hai `package.json` và hai `.env.example`: đạt.
- Phân tích stylesheet bằng `tinycss2`: 287 rule cấp cao nhất, 0 lỗi parse. Cấu hình Vite đã được cập nhật lên Vite 8 và plugin React tương thích; cần Node.js 22.12+ hoặc 20.19+ để chạy Vite 8.

### Kiểm tra chưa thể hoàn tất tại môi trường này

Không thể chạy `npm install` để cài dependency vì môi trường thực thi không phân giải được `registry.npmjs.org` (`EAI_AGAIN`). Máy dựng cũng không có `mongod`/MongoDB server. Vì vậy chưa thể xác nhận `vite build`, khởi động Express với dependency thật, kết nối MongoDB hoặc chạy test end-to-end trong trình duyệt tại đây.

Các kiểm tra cú pháp ở trên không thay thế cho kiểm thử tích hợp. Sau khi tải source về máy có Internet và MongoDB, làm theo README để cài dependency, seed dữ liệu và chạy thử toàn bộ luồng.

## 5. Các phần vẫn có thể nâng cấp tiếp

- QR Code check-in, email/thông báo khi yêu cầu tham gia được duyệt.
- Upload ảnh CLB/sự kiện với kiểm tra định dạng/kích thước và lưu trữ đám mây.
- Đặt lại mật khẩu, xác thực email, đổi mật khẩu.
- Kiểm thử tự động API/UI, logging, giám sát và triển khai Internet.
- Phân trang server-side cho danh sách sự kiện và danh sách thành viên quy mô lớn.

## Bổ sung V3 theo yêu cầu phân quyền và thành lập CLB

### Thay đổi nghiệp vụ
- Bổ sung `ClubApplication` để lưu hồ sơ thành lập CLB độc lập với collection `Club`.
- Người dùng đã đăng nhập gửi hồ sơ; backend xác thực điều kiện ở máy chủ; hồ sơ có trạng thái `pending`, `processing`, `approved`, `rejected`.
- Admin nền tảng xem xét hồ sơ trong Dashboard. Khi duyệt, backend tạo Club và Membership `owner` cho người nộp. Người nộp vẫn giữ `User.role=member`.
- Khóa API tạo CLB trực tiếp để tránh bỏ qua bước phê duyệt; dữ liệu demo được seed vẫn giữ để phục vụ trình diễn.
- Thêm trang theo dõi hồ sơ cá nhân, form đề xuất thành lập và trang xét duyệt dành cho Admin.

### Xác thực đa phương thức
- Email/mật khẩu: giữ bcrypt.
- Google: dùng Google Identity Services phía client và kiểm tra ID token/audience/email_verified tại backend.
- Facebook: dùng Facebook SDK phía client; backend debug token và xác nhận App ID qua Graph API.
- Điện thoại: dùng Twilio Verify gửi SMS OTP và chỉ đăng nhập/tạo tài khoản khi mã được xác minh.
- Hồ sơ tài khoản: liên kết số điện thoại qua OTP, Google và Facebook qua OAuth/SDK khi đã đăng nhập.
- Mật khẩu có nút hiện/ẩn; mật khẩu vẫn được gửi qua HTTPS trong production và hash bằng bcrypt ở máy chủ.

### Kiểm tra thực hiện
- Đã chạy `node --check` cho các file backend JavaScript.
- Đã transpile cú pháp JavaScript/JSX frontend bằng TypeScript transpile API.
- Đã rà soát import tương đối của frontend.
- Chưa chạy build Vite và kiểm thử tích hợp Google/Facebook/Twilio/MongoDB trong môi trường này do chưa cài dependencies và chưa có thông tin credentials thực tế. Cần thực hiện các bước cấu hình trong README trên máy chạy dự án.


## 4. Bổ sung V3.1 cho hồ sơ thành lập CLB

- Thêm kế hoạch tổ chức nhân sự và kế hoạch tài chính vào bộ hồ sơ bắt buộc; backend kiểm tra độ dài tối thiểu và giới hạn tối đa, tránh chỉ dựa vào HTML validation.
- Đội ngũ sáng lập có 5–30 người; mỗi người khai báo họ tên, nhiệm vụ và ít nhất email hoặc số điện thoại chuẩn E.164. Người nộp phải khớp với email/số điện thoại đang gắn tài khoản, gồm cả tài khoản phone-only.
- Chuẩn hóa dữ liệu allowlist trước khi ghi ClubApplication, không nhận các trường hệ thống như `status`, `reviewedBy`, `createdClub` từ request của người dùng.
- Khi duyệt, sao chép kế hoạch và đội ngũ sáng lập vào Club để hồ sơ được công khai đầy đủ sau khi duyệt. API công khai loại bỏ email/số điện thoại cá nhân của từng thành viên sáng lập; Admin mới xem được dữ liệu liên hệ đầy đủ trong hồ sơ xét duyệt.
- Khi từ chối hồ sơ, Admin phải ghi lý do; ghi chú bị giới hạn 1.500 ký tự.
- Kiểm tra cú pháp Node backend và phân tích cú pháp JSX/import frontend sau thay đổi. Chưa chạy được Vite build hoặc kiểm thử tích hợp do npm registry không truy cập được và chưa có dịch vụ MongoDB/OAuth/Twilio cấu hình.


## Bổ sung V3.2: xác thực đa phương thức và vai trò Admin theo phạm vi

- Trang xác thực có đăng nhập/đăng ký bằng email + mật khẩu (nút con mắt hiện/ẩn), Google Identity Services, Facebook Login và số điện thoại xác minh OTP SMS qua Twilio Verify.
- Tài khoản có thể liên kết thêm Google, Facebook hoặc số điện thoại trong Hồ sơ cá nhân. ID/access token được xác minh ở backend; không nhận ID mạng xã hội từ client để tự nhận dạng.
- Google/Facebook/Twilio chưa thể kiểm thử tích hợp vì cần Client ID/App ID/Secret và tài khoản dịch vụ thực của chủ dự án. Khi chưa cấu hình, UI thể hiện trạng thái chưa khả dụng thay vì giả lập đăng nhập.
- Tách quyền `User.role=admin` (Admin toàn website) khỏi `Membership.role=owner` (Chủ nhiệm/Admin của một CLB). Người gửi hồ sơ được duyệt trở thành Chủ nhiệm CLB tương ứng, không được nâng thành Admin toàn website.
- Thêm guide `docs/CAU_HINH_DANG_NHAP.md` hướng dẫn tạo credentials và đặt biến môi trường.


## Bản đóng gói V3.3

- Cập nhật `vite` lên `^8.3.5` và `@vitejs/plugin-react` lên `^6.2.1`; yêu cầu Node.js 22.12+ hoặc 20.19+.
- Chạy lại kiểm tra cú pháp: 16 file backend, 20 file frontend/config, 52 import tương đối, 287 rule CSS; không phát hiện lỗi parse hoặc import thiếu.
- Không tuyên bố build hoặc E2E thành công do npm registry không truy cập được trong môi trường đóng gói và không có MongoDB/credentials Google, Facebook, Twilio để kiểm thử tích hợp.
