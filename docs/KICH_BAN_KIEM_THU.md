# Kịch bản kiểm thử thủ công ClubHub

Tài liệu này dùng sau khi cài dependency, chạy MongoDB và cấu hình provider. Kiểm thử bằng hai profile trình duyệt riêng (Admin website và tài khoản người dùng) để tránh ghi đè token trong `localStorage`.

## A. Đăng ký và đăng nhập

| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| A1 | Mở `/auth`, chọn đăng ký bằng email, nhập họ tên/email/mật khẩu dưới 8 ký tự | Trình duyệt báo dữ liệu không hợp lệ hoặc API trả 400; không tạo user |
| A2 | Đăng ký email/mật khẩu hợp lệ | API trả 201; mật khẩu trong MongoDB là bcrypt hash, không phải plaintext |
| A3 | Nhấn biểu tượng mắt ở trường mật khẩu | Trường đổi từ `type=password` sang `type=text`; nhấn lại thì ẩn |
| A4 | Đăng nhập sai mật khẩu | API trả 401; không lưu token |
| A5 | Đăng nhập đúng | API trả JWT; header chuyển sang trạng thái đã đăng nhập |
| A6 | Đăng nhập Google sau khi cấu hình Client ID | GIS trả ID token; backend xác minh chữ ký/audience/email; user nhận JWT ClubHub |
| A7 | Đăng nhập Facebook sau khi cấu hình App ID/Secret | Backend kiểm tra access token thuộc đúng Facebook App; hồ sơ được tạo/đọc nếu có email |
| A8 | Chọn đăng ký bằng số điện thoại chưa tồn tại | Gửi OTP; chỉ sau khi OTP được Twilio xác nhận `approved` mới tạo user |
| A9 | Chọn đăng nhập bằng số điện thoại chưa đăng ký | API trả 404, hướng dẫn chuyển sang đăng ký; không gửi OTP đăng nhập |
| A10 | Liên kết thêm số điện thoại/Google/Facebook trong trang Cá nhân | Provider được thêm vào `authProviders`; không thể liên kết provider đã thuộc tài khoản khác |

## B. Xin thành lập câu lạc bộ

| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| B1 | Guest mở `/club-applications/new` | Chuyển tới `/auth?redirect=...` |
| B2 | Member gửi hồ sơ thiếu trường kế hoạch/thiếu cam kết | Frontend chặn submit; nếu bỏ qua frontend, backend vẫn trả 400 |
| B3 | Khai báo dưới 5 người hoặc trên 30 người sáng lập | Không được gửi hồ sơ |
| B4 | Một founder thiếu cả email và số điện thoại | API trả 400 |
| B5 | Người gửi không xuất hiện trong danh sách bằng email/điện thoại đang gắn tài khoản | API trả 400 |
| B6 | Gửi hồ sơ hợp lệ | API trả 201; hồ sơ lưu `pending`; chưa tạo Club |
| B7 | Người gửi mở “Hồ sơ CLB của tôi” | Xem được trạng thái và thời gian gửi |
| B8 | Member cố gọi API duyệt hồ sơ | API trả 403 |
| B9 | Admin mở Dashboard → Hồ sơ thành lập | Xem được kế hoạch và dữ liệu đội ngũ đầy đủ |
| B10 | Admin từ chối mà không có lý do | UI yêu cầu lý do; backend trả 400 nếu gọi trực tiếp |
| B11 | Admin phê duyệt hồ sơ hợp lệ | Tạo Club; tạo Membership `approved` + `owner` cho người nộp; hồ sơ thành `approved` |
| B12 | Người nộp mở CLB sau khi duyệt | Thấy nhãn “Chủ nhiệm · Admin CLB” và khu vực quản lý |
| B13 | Kiểm tra `User.role` của người nộp trong MongoDB | Vẫn là `member`, không phải `admin` toàn website |
| B14 | Guest xem chi tiết CLB mới | Chỉ thấy tên và nhiệm vụ đội ngũ sáng lập; không thấy email/điện thoại cá nhân, ngân sách hoặc email cố vấn |

## C. Phân quyền và quản lý CLB

| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| C1 | Member gửi yêu cầu tham gia CLB bật duyệt | Membership tạo với `pending` |
| C2 | Chủ nhiệm/Điều phối viên mở quản lý thành viên | Xem được danh sách và đơn đang chờ |
| C3 | Chủ nhiệm duyệt thành viên | Membership chuyển `approved`, role `member` |
| C4 | Chủ nhiệm thêm tài khoản qua email/số điện thoại đã đăng ký | Tạo/cập nhật Membership `approved` |
| C5 | Nhập email/số điện thoại không tồn tại | API trả 404 |
| C6 | Thành viên tự rời CLB | Membership bị xóa; Chủ nhiệm không thể tự rời trước khi chuyển quyền |
| C7 | Chủ nhiệm chuyển quyền cho thành viên chính thức | Người mới thành `owner`; người cũ thành `moderator` |
| C8 | Điều phối viên thử bổ nhiệm Điều phối viên khác | API trả 403 |
| C9 | Thành viên thường gọi API roster/duyệt | API trả 403 |
| C10 | Chủ nhiệm CLB A cố sửa/xóa CLB B | API trả 403 |
| C11 | Member thường mở `/dashboard` | Không được truy cập dashboard hệ thống |
| C12 | Admin website mở `/dashboard` | Truy cập được dashboard toàn hệ thống và hồ sơ xét duyệt |

## D. Sự kiện và điểm danh

1. Chủ nhiệm tạo sự kiện trong CLB mình quản lý; sự kiện xuất hiện trong danh sách công khai nếu trạng thái `published`.
2. Member đăng ký một lần; đăng ký lần hai nhận 409.
3. Member thử đăng ký sự kiện đã bắt đầu, đã hủy hoặc hết chỗ; API từ chối.
4. Nếu sự kiện yêu cầu membership, user chưa được duyệt không thể đăng ký.
5. Chủ nhiệm mở roster đăng ký và đánh dấu một người đã tham dự; trạng thái `attended` cập nhật.
6. Thành viên xem lịch sử đăng ký trong “Hoạt động của tôi”.

## E. Kiểm tra an toàn trước khi deploy

- [ ] Thay `JWT_SECRET` bằng chuỗi ngẫu nhiên riêng, dài tối thiểu 32 ký tự.
- [ ] Thay mật khẩu Admin seed mặc định; không sử dụng tài khoản demo công khai.
- [ ] Không commit `.env`; không đưa `FACEBOOK_APP_SECRET`/Twilio Auth Token vào frontend.
- [ ] Đặt `CLIENT_URL` đúng domain frontend và bật HTTPS.
- [ ] Cấu hình Google/Facebook domain production; kiểm tra chế độ development/live và quyền provider.
- [ ] Kiểm tra giới hạn gửi OTP, chống SMS abuse và chi phí Twilio.
- [ ] Sao lưu MongoDB trước khi migration hoặc xóa dữ liệu.
- [ ] Chạy `npm.cmd run check`, `npm.cmd run build` và toàn bộ kịch bản ở trên trên máy có dependency/MongoDB thật.
