# Cấu hình đăng nhập Google, Facebook và số điện thoại

Trang `/auth` đã có ba nhóm phương thức:

1. **Email + mật khẩu**: đăng ký/đăng nhập với mật khẩu hash bằng bcrypt. Nút con mắt chuyển trường mật khẩu giữa `password` và `text`.
2. **Google và Facebook**: đăng nhập/đăng ký bằng tài khoản bên thứ ba. Backend xác minh token với nhà cung cấp trước khi cấp JWT ClubHub.
3. **Số điện thoại**: đăng ký/đăng nhập bằng OTP SMS qua Twilio Verify. Không lưu mã OTP trong MongoDB và không cho đăng nhập chỉ bằng số điện thoại chưa xác minh.

Các tính năng này cần tài khoản nhà cung cấp và thông tin cấu hình của người triển khai. Source code không thể tự tạo Client ID, App Secret hay gửi SMS miễn phí.

## 1. Chuẩn bị file môi trường

Tại thư mục gốc dự án:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Không commit hai file `.env`. Chỉ commit `.env.example`. Mọi secret phải nằm ở backend.

## 2. Google Sign-In

1. Mở [Google Cloud Console](https://console.cloud.google.com/).
2. Tạo hoặc chọn một Google Cloud project.
3. Thiết lập OAuth consent screen/Google Auth Platform branding và tạo OAuth Client ID loại **Web application**.
4. Ở **Authorized JavaScript origins**, thêm `http://localhost:5173` khi phát triển. Khi deploy, thêm origin HTTPS chính thức của website.
5. Sao chép Client ID (chuỗi kết thúc bằng `.apps.googleusercontent.com`).
6. Đặt cùng một giá trị vào cả hai file:

`client/.env`:

```env
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

`server/.env`:

```env
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

7. Khởi động lại cả Vite và Express.

Frontend sử dụng Google Identity Services để nhận ID token. Backend dùng `google-auth-library` và `OAuth2Client.verifyIdToken()` để xác minh chữ ký, thời hạn và audience; sau đó kiểm tra `email_verified` và sử dụng `sub` làm định danh provider. Không gửi mật khẩu Google về ClubHub.

Tài liệu chính thức:
- [Google Identity Services – Setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Google – Verify ID token on server](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)

## 3. Facebook Login

1. Mở [Meta for Developers](https://developers.facebook.com/), tạo ứng dụng.
2. Thêm sản phẩm **Facebook Login** và thiết lập website/platform theo hướng dẫn của Meta.
3. Điền App Domains/domain website và URL website tương ứng. Với bản local, dùng `localhost` và `http://localhost:5173` ở trường hợp dashboard yêu cầu.
4. Trong phần App Settings, lấy **App ID** và **App Secret**.
5. Đặt App ID ở frontend và backend; chỉ đặt App Secret ở backend:

`client/.env`:

```env
VITE_FACEBOOK_APP_ID=your-facebook-app-id
```

`server/.env`:

```env
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

6. Khi kiểm thử, thêm tài khoản của nhóm vào vai trò tester/developer nếu ứng dụng Meta đang ở Development mode. Trước khi mở công khai, hoàn thiện yêu cầu quyền/đánh giá ứng dụng theo chính sách Meta.
7. Khởi động lại frontend và backend.

Facebook Login hiện yêu cầu provider trả về email. Nếu tài khoản Facebook không cung cấp email, người dùng phải dùng email/mật khẩu, Google hoặc OTP điện thoại.

**Quan trọng:** `FACEBOOK_APP_SECRET` chỉ ở `server/.env`. Không đặt tên biến là `VITE_FACEBOOK_APP_SECRET`; mọi biến `VITE_` có thể được đóng gói vào JavaScript trình duyệt.

## 4. Đăng nhập số điện thoại bằng Twilio Verify

1. Tạo tài khoản tại [Twilio Console](https://console.twilio.com/).
2. Mở **Verify → Services**, tạo một Verify Service và chọn SMS.
3. Lấy Account SID, Auth Token ở Twilio Console và Service SID (bắt đầu bằng `VA`) của Verify Service.
4. Đặt trong `server/.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

5. Không đặt bất kỳ Twilio secret nào trong `client/.env`.
6. Nhập số điện thoại theo định dạng E.164, ví dụ `+84901234567`.
7. Thử đăng ký số chưa tồn tại, nhận SMS và nhập OTP. Sau khi tài khoản được tạo, chuyển sang đăng nhập và gửi OTP lần tiếp theo.

Twilio Verify dùng hai bước: tạo Verification để gửi mã và Verification Check để xác minh mã. Với tài khoản Trial, Twilio có thể yêu cầu xác minh trước số điện thoại nhận tin; giới hạn và khả năng gửi SMS còn phụ thuộc quốc gia, nhà mạng và cấu hình/tài khoản Twilio.

Tài liệu chính thức:
- [Twilio Verify API](https://www.twilio.com/docs/verify/api)
- [Twilio Verify – SMS overview](https://www.twilio.com/docs/verify/sms)

## 5. Liên kết thêm phương thức đăng nhập

Sau khi đăng nhập, mở **Cá nhân → Liên kết tài khoản mạng xã hội / số điện thoại**.

- Google: dùng Google Identity Services, gửi ID token cho backend xác minh.
- Facebook: dùng Facebook SDK, backend kiểm tra access token, App ID và hồ sơ provider.
- Điện thoại: gửi OTP tới số mới, chỉ liên kết sau khi mã xác minh hợp lệ.

Một provider không thể liên kết đồng thời vào hai tài khoản ClubHub. Nếu email Google/Facebook trùng tài khoản email/mật khẩu chưa xác minh, hãy đăng nhập tài khoản đó bằng phương thức hiện tại rồi chủ động liên kết trong trang Cá nhân. Cách này ngăn việc tự động ghép tài khoản chỉ dựa trên email chưa xác minh.

## 6. Phân biệt lỗi cấu hình và lỗi code

| Thông báo / biểu hiện | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Google · Chưa cấu hình | Thiếu `VITE_GOOGLE_CLIENT_ID` | Thêm Client ID vào `client/.env` |
| Google API trả 503 | Thiếu `GOOGLE_CLIENT_ID` ở server | Thêm cùng Client ID vào `server/.env` |
| Google origin/unauthorized domain | Origin chưa đăng ký | Thêm đúng `http://localhost:5173` hoặc domain HTTPS |
| Facebook · Chưa cấu hình | Thiếu App ID | Thêm App ID ở cả client và server |
| Facebook token invalid | App Secret/App ID sai, token hết hạn hoặc app không đúng | Kiểm tra Meta App settings và khởi động lại |
| SMS chưa được cấu hình (503) | Thiếu một trong ba biến Twilio | Kiểm tra SID, Auth Token, Verify Service SID |
| OTP không gửi được | Trial account, quốc gia/nhà mạng, fraud control hoặc billing chưa phù hợp | Xem trạng thái Verify Service và log Twilio |
| `CORS` error | `CLIENT_URL` không trùng origin frontend | Đặt `CLIENT_URL=http://localhost:5173` (hoặc domain deploy) |

Sau khi chỉnh bất kỳ `.env` nào, hãy dừng và chạy lại cả hai server. Vite không tự nạp lại biến môi trường nếu chỉ sửa file trong lúc đang chạy.

## 7. Checklist trước khi triển khai Internet

- Dùng HTTPS.
- Thay JWT secret và mật khẩu seed mặc định bằng secret ngẫu nhiên, riêng biệt.
- Dùng Google/Facebook app ở chế độ và domain production đã cấu hình; hoàn thành review/quyền cần thiết.
- Bật các biện pháp chống SMS abuse của Twilio; đặt hạn mức gửi OTP và theo dõi chi phí.
- Không log ID token, access token, OTP, App Secret hoặc Twilio Auth Token.
- Kiểm tra chính sách riêng tư, điều khoản sử dụng, thời hạn lưu dữ liệu và quy trình khóa/khôi phục tài khoản.
- Thực hiện test end-to-end cho đăng ký, đăng nhập, liên kết và thu hồi phiên.

Các bước tạo credentials thay đổi theo dashboard nhà cung cấp; hãy ưu tiên tài liệu chính thức đang hiển thị trong tài khoản nhà cung cấp khi cấu hình thực tế.
