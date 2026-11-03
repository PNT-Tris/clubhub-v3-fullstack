# Giải thích cấu trúc và các file trong ClubHub

Tài liệu này giải thích trách nhiệm, luồng hoạt động và các câu lệnh quan trọng của từng file để bạn có thể đọc code và trình bày khi bảo vệ.

## A. Thư mục gốc

### `.gitignore`

- `node_modules/`: không đưa thư viện tải từ npm lên Git.
- `.env`, `.env.*`: loại trừ biến môi trường chứa mật khẩu, JWT secret và URI database.
- `!.env.example`: vẫn cho phép commit file mẫu không chứa bí mật thật.
- `dist/`, `coverage/`, `uploads/`: loại trừ file build, kết quả test và file tải lên.

### `README.md`

Tài liệu để thành viên khác cài đặt, chạy dự án, hiểu API, phân quyền và demo nghiệp vụ. Đây là file đầu tiên nên đọc khi clone repository.

## B. Frontend – `client/`

### `client/package.json`

- `dependencies`: thư viện chạy cùng ứng dụng: React, React DOM, React Router, Lucide và Zustand.
- `devDependencies`: Vite và plugin React dùng trong phát triển/build.
- `dev`: chạy máy chủ phát triển.
- `build`: biên dịch source thành thư mục `dist`.
- `preview`: chạy thử bản build.

### `client/vite.config.js`

`defineConfig()` tạo cấu hình Vite; `plugins: [react()]` bật React Fast Refresh và JSX runtime; `server.host` cho phép truy cập từ mạng nội bộ; `port` đặt cổng 5173; `strictPort` không tự nhảy sang cổng khác nếu cổng đã bận.

### `client/.env.example`

`VITE_API_URL` xác định địa chỉ backend. Vite chỉ đưa biến có tiền tố `VITE_` vào code frontend. Không đặt mật khẩu hoặc JWT secret ở đây vì biến frontend có thể được người dùng xem.

### `client/index.html`

Trang HTML gốc. `div#root` là vị trí React gắn giao diện; `script type="module"` nạp `src/main.jsx`.

### `client/src/main.jsx`

- `createRoot(...)`: khởi tạo React root.
- `BrowserRouter`: bật điều hướng theo URL.
- `AuthProvider`: cung cấp user/token cho mọi trang.
- `isReady`: chờ khôi phục phiên từ JWT trước khi render route, tránh nháy trạng thái đăng xuất khi tải lại trang.
- `App`: component điều hướng chính.
- `styles.css`: nạp stylesheet dùng chung.

### `client/src/App.jsx`

Định nghĩa thanh điều hướng, header/footer và các đường dẫn:

- `/`: trang chủ.
- `/clubs`, `/clubs/:id`: danh sách và chi tiết CLB.
- `/events`, `/events/:id`: danh sách và chi tiết sự kiện.
- `/auth`: đăng ký/đăng nhập.
- `/profile`: hồ sơ.
- `/my-activities`: CLB và sự kiện người dùng đã đăng ký.
- `/dashboard`: dashboard dành cho Admin.

`NavLink` tự nhận biết route đang active; `Routes` chứa các `Route`; `useNavigate` điều hướng sau đăng nhập/đăng xuất.

### `client/src/api.js`

Hàm `request(path, options)` là lớp gọi API dùng chung:

1. Đọc JWT từ `localStorage`.
2. Gắn `Content-Type` và `Authorization: Bearer ...` khi có token.
3. Gọi `fetch()` đến `VITE_API_URL`.
4. Chuyển JSON response thành object.
5. Nếu `response.ok` là false, ném Error chứa thông báo backend để component hiển thị.

`toQuery()` chuyển object thành query string; ví dụ `{page: 2, limit: 10}` thành `?page=2&limit=10`.

### `client/src/context/AuthContext.jsx`

- `createContext`: tạo kho trạng thái đăng nhập.
- `AuthProvider`: quản lý `user`, `token`, `isReady`.
- `useEffect`: khi có token, gọi `/auth/me` để khôi phục phiên sau khi tải lại trang.
- `login`: gửi email/password, lưu token và thông tin user.
- `register`: tạo tài khoản mới.
- `acceptSession`: nhận JWT từ luồng Google/Facebook hoặc xác minh OTP và lưu phiên.
- `updateCurrentUser`: đồng bộ hồ sơ sau khi liên kết thêm phương thức đăng nhập.
- `updateProfile`: cập nhật tên.
- `logout`: xóa token và user khỏi state/localStorage.
- `useAuth`: hook để component lấy dữ liệu đăng nhập.

### `client/src/store/useEventStore.js`

Dùng Zustand giữ `search` và `category` cho trang sự kiện. `create()` khởi tạo store; `set()` thay đổi state; component nào gọi `useEventStore()` đều đọc được bộ lọc dùng chung.

### `client/src/components.jsx`

- `EventCard`: thẻ tóm tắt sự kiện và liên kết đến trang chi tiết.
- `SectionTitle`: tiêu đề section tái sử dụng.
- `Loading`: trạng thái tải dữ liệu.
- `Empty`: trạng thái danh sách rỗng.
- `ErrorMessage`, `SuccessMessage`: hiển thị lỗi/thành công.

Tách component dùng chung giúp tránh viết lại cùng một giao diện ở nhiều trang.

### `client/src/pages/Home.jsx`

Gọi `GET /events` và `GET /clubs` để lấy nội dung nổi bật; render hero, sự kiện nổi bật và câu lạc bộ. `useEffect` chạy khi trang được tạo; `useState` lưu dữ liệu và trạng thái tải.

### `client/src/pages/Clubs.jsx`

Gọi `GET /clubs`; `search` lọc theo tên/mô tả; `category` lọc danh mục; `Link` mở trang chi tiết từng CLB.

### `client/src/pages/ClubDetail.jsx`

Đây là trang nghiệp vụ thành viên CLB:

- `GET /clubs/:id`: lấy thông tin CLB.
- `GET /clubs/:id/membership/me`: lấy trạng thái tham gia của user.
- `POST /clubs/:id/join`: gửi yêu cầu tham gia.
- `DELETE /clubs/:id/membership`: rút yêu cầu/rời CLB.
- `GET /clubs/:id/members`: Ban chủ nhiệm lấy danh sách thành viên và đơn chờ duyệt.
- `POST /clubs/:id/members`: thêm người dùng bằng email hoặc số điện thoại E.164 đã đăng ký ClubHub.
- `PATCH /clubs/:id/members/:userId`: duyệt, từ chối hoặc đổi vai trò.
- `DELETE /clubs/:id/members/:userId`: xóa thành viên.
- `POST /clubs/:id/transfer-ownership`: chuyển quyền Chủ nhiệm.
- `POST/PUT/DELETE /events`: Ban chủ nhiệm quản lý sự kiện của CLB.

`canManage` chỉ bật khu vực quản trị khi tài khoản là Admin hoặc membership đã duyệt có role owner/moderator. Chủ nhiệm và Điều phối viên có thể nhập email hoặc số điện thoại để thêm tài khoản đã đăng ký. API vẫn tự kiểm tra quyền ở backend; ẩn nút trên frontend không phải biện pháp bảo mật.

### `client/src/pages/Events.jsx`

Tải danh sách sự kiện công khai, lọc theo từ khóa và danh mục bằng Zustand, hiển thị `EventCard`.

### `client/src/pages/EventDetail.jsx`

Hiển thị thông tin sự kiện, kiểm tra trạng thái đăng ký hiện tại, gửi đăng ký/hủy đăng ký. Với người có quyền quản lý, trang lấy roster và cho phép cập nhật điểm danh; kể cả khi chưa có ai đăng ký vẫn hiện khung điểm danh với trạng thái rỗng.

### `client/src/pages/Auth.jsx`

Có hai chế độ đăng ký/đăng nhập và hai tab phương thức Email/Số điện thoại. Email dùng mật khẩu có nút Eye/EyeOff để hiện/ẩn; Google Identity Services dùng ID token, Facebook SDK dùng access token, điện thoại dùng OTP SMS. `event.preventDefault()` ngăn tải lại trang; `async/await` đợi API. Các provider yêu cầu credentials thực tế.

### `client/src/pages/Profile.jsx`

Cho phép xem hồ sơ và provider đã liên kết, cập nhật tên, liên kết số điện thoại bằng OTP và liên kết Google/Facebook vào tài khoản đang đăng nhập.

### `client/src/pages/MyActivities.jsx`

Gọi `GET /clubs/mine/memberships` và `GET /events/mine/registrations`; tách danh sách CLB, trạng thái xét duyệt và sự kiện đã đăng ký.

### `client/src/pages/Dashboard.jsx`

Chỉ Admin website được truy cập. Có bốn tab:

- Tổng quan: gọi `/dashboard/stats` và `/dashboard/recent`.
- Hồ sơ thành lập: nhúng `AdminClubApplications` để xét duyệt hồ sơ.
- Câu lạc bộ: gọi `/clubs/manage/all`; Admin chỉ sửa/xóa/ẩn/hiện CLB đã có. Không tạo CLB trực tiếp; hồ sơ mới phải đi qua xét duyệt.
- Sự kiện: gọi `/events/manage/all`; form gửi `POST`, `PUT`, `DELETE` cho sự kiện.

`editingClub`/`editingEvent` lưu ID đang chỉnh sửa. Form CLB chỉ phục vụ cập nhật CLB có sẵn; tạo CLB mới bắt buộc qua hồ sơ thành lập và phê duyệt. Form sự kiện hỗ trợ tạo mới khi chưa có ID và cập nhật khi có ID.

### `client/src/pages/NotFound.jsx`

Trang 404 khi URL không có route tương ứng.

### `client/src/styles.css`

Chứa design tokens trong `:root`, bố cục Grid/Flexbox, màu, gradient, animation, hover, spinner, form, card, dashboard và media query. `@media` điều chỉnh cột/menu/khoảng cách theo độ rộng màn hình.

## C. Backend – `server/`

### `server/package.json`

- `dev`: chạy `nodemon`, tự khởi động lại khi file thay đổi.
- `start`: chạy Node trực tiếp.
- `seed`: tạo tài khoản Admin, CLB và sự kiện mẫu.
- `check`: chạy `src/scripts/check.js` để dùng `node --check` kiểm tra toàn bộ file JavaScript backend.

### `server/.env.example`

- `PORT`: cổng Express.
- `MONGODB_URI`: địa chỉ MongoDB.
- `JWT_SECRET`: khóa ký JWT, cần thay bằng chuỗi ngẫu nhiên riêng dài ít nhất 32 ký tự.
- `CLIENT_URL`: origin frontend được phép gọi API.
- `SEED_ADMIN_*`: thông tin tài khoản Admin dùng bởi script seed.

### `server/src/server.js`

`import 'dotenv/config'` nạp biến môi trường trước app; kiểm tra `MONGODB_URI`/`JWT_SECRET`; `mongoose.connect()` kết nối database; chỉ khi kết nối thành công mới gọi `app.listen()`.

### `server/src/app.js`

- `helmet()`: thêm HTTP security headers.
- `cors()`: chỉ cho phép origin đã cấu hình.
- `express.json()`: đọc JSON body.
- `rateLimit()`: giới hạn tần suất gọi API xác thực.
- `app.use('/api/...', router)`: gắn nhóm route.
- `notFound`, `errorHandler`: xử lý URL không tồn tại và lỗi tập trung.

### `server/src/models/User.js`

Mongoose Schema của tài khoản: tên, email duy nhất, mật khẩu hash, role hệ thống, avatar, số điện thoại và timestamps. `select: false` ngăn trả password trong truy vấn thông thường.

### `server/src/models/Club.js`

Schema thông tin CLB, người tạo, liên hệ, địa điểm, ảnh và `joinApprovalRequired`. Trường này quyết định đơn tham gia phải chờ duyệt hay được tham gia ngay.

### `server/src/models/Membership.js`

Schema liên kết `club` và `user`. `status` lưu tiến trình xét duyệt; `role` lưu quyền trong CLB. `ref` cho phép `.populate()` lấy tên/email người dùng. Unique index tránh một user có nhiều membership trùng trong cùng CLB.

### `server/src/models/ClubApplication.js`

Lưu đề xuất thành lập CLB trước khi có collection `Club` chính thức. Hồ sơ chứa người nộp, tên/danh mục, giới thiệu, sứ mệnh, đối tượng, kế hoạch hoạt động/học kỳ/nhân sự/tài chính, danh sách sáng lập, thông tin liên hệ, cố vấn và trạng thái xét duyệt. Chỉ Admin website được xem toàn bộ hồ sơ và phê duyệt.

### `server/src/models/Event.js`

Schema sự kiện: tiêu đề, mô tả, danh mục, địa điểm, thời gian, sức chứa, trạng thái, CLB, người tạo và registrations. Mỗi registration có user, thời gian đăng ký và cờ attended.

### `server/src/middleware/auth.middleware.js`

- `protect`: đọc Bearer token, `jwt.verify()` xác thực chữ ký/hạn token, tìm User và gắn vào `req.user`.
- `adminOnly`: chỉ cho role hệ thống `admin` đi tiếp.
- `clubManagerOnly`: yêu cầu membership approved với role owner/moderator hoặc Admin.
- `clubOwnerOnly`: yêu cầu role owner hoặc Admin.
- `next()`: chuyển request đến route handler tiếp theo.

### `server/src/middleware/error.middleware.js`

`notFound` trả 404 cho API sai; `errorHandler` chuyển CastError/ValidationError/duplicate key/JSON sai thành mã HTTP tương ứng; lỗi 500 trả thông báo chung thay vì stack trace.

### `server/src/routes/auth.routes.js`

- `POST /register`, `POST /login`: đăng ký/đăng nhập email, hash/so sánh password bằng bcrypt.
- `POST /google`: nhận Google ID token và xác minh audience/email ở backend.
- `POST /facebook`: xác minh Facebook access token và App ID ở backend.
- `POST /phone/send-otp`, `/phone/verify-otp`: gửi/kiểm tra OTP SMS qua Twilio Verify, phân biệt intent đăng ký và đăng nhập.
- Các route `/google/link`, `/facebook/link`, `/phone/link/*`: liên kết provider vào tài khoản hiện tại.
- `GET /me`: trả hồ sơ hiện tại.
- `PATCH /me`: sửa tên.
- `GET /me/summary`: lấy Membership và sự kiện tương lai của user.

### `server/src/routes/club.routes.js`

Chịu trách nhiệm list/detail, cập nhật/xóa CLB đã được duyệt và vòng đời Membership: join/leave; xem roster; thêm member bằng email/số điện thoại; approve/reject; đổi role; remove; chuyển quyền Chủ nhiệm. API tạo CLB trực tiếp bị chặn để buộc đi qua hồ sơ thành lập. Mọi thao tác quản trị đều kiểm tra middleware quyền trước handler.

### `server/src/routes/event.routes.js`

Chịu trách nhiệm list/detail/CRUD sự kiện, sự kiện thuộc CLB, sự kiện của tôi, đăng ký/hủy, roster đăng ký và điểm danh. `canManageEvent()` kiểm tra Admin hoặc membership owner/moderator. Đăng ký dùng `findOneAndUpdate` có điều kiện để kiểm tra trạng thái, thời gian, trùng user và sức chứa trong một lần cập nhật.

### `server/src/routes/dashboard.routes.js`

`GET /stats` dùng `Promise.all()` chạy các phép đếm song song và `aggregate()` cộng tổng registration; `GET /recent` lấy dữ liệu mới nhất cho Admin.

### `server/src/scripts/check.js`

Duyệt đệ quy thư mục `server/src`, tìm các file `.js` và gọi `node --check` cho từng file. Script dùng `process.execPath` nên chạy bằng đúng phiên bản Node hiện tại trên Windows/macOS/Linux; không cần MongoDB.

### `server/src/scripts/seed.js`

Kết nối MongoDB, tạo Admin nếu chưa có, tạo bốn CLB mẫu, tạo membership owner mặc định nếu CLB chưa có Chủ nhiệm, sau đó tạo bốn sự kiện tương lai. Có thể chạy nhiều lần; kiểm tra tên/email trước khi tạo để tránh nhân bản dữ liệu mẫu và không ghi đè người đã được chuyển giao quyền Chủ nhiệm.

## D. Luồng nghiệp vụ để trình bày khi bảo vệ

### 1. Thành viên đăng ký tham gia CLB

1. Member bấm nút tại `ClubDetail.jsx`.
2. Frontend gửi `POST /api/clubs/:id/join` kèm JWT.
3. `protect` xác định user.
4. Route đọc cấu hình `joinApprovalRequired`.
5. Tạo `Membership` với status `pending` hoặc `approved`.
6. Frontend tải lại trạng thái và hiển thị thông báo.

### 2. Chủ nhiệm duyệt thành viên

1. Chủ nhiệm mở trang CLB.
2. Backend kiểm tra membership owner/moderator.
3. Frontend lấy roster từ `GET /api/clubs/:id/members`.
4. Khi bấm duyệt, gọi `PATCH /api/clubs/:id/members/:userId` với `{status: 'approved'}`.
5. Membership được cập nhật; member count tính lại từ status approved.

### 3. Đăng ký sự kiện

1. Member mở chi tiết event.
2. Frontend gọi `/registration/me` để biết đã đăng ký chưa.
3. Khi bấm đăng ký, backend kiểm tra event published, chưa bắt đầu, membership nếu sự kiện giới hạn, đăng ký trùng và capacity.
4. MongoDB cập nhật registration.
5. Thành viên xem event trong trang Hoạt động của tôi.

### 4. Điểm danh

1. Ban chủ nhiệm/Điều phối viên/Admin mở danh sách registration.
2. Backend kiểm tra quyền quản lý sự kiện.
3. Frontend gửi `PATCH /api/events/:id/attendance/:userId` với `{attended: true}`.
4. Trường `attended` cập nhật và danh sách hiển thị trạng thái mới.

## `client/src/pages/ClubApplicationForm.jsx`

Form đề xuất thành lập CLB gồm thông tin cơ bản, sứ mệnh, kế hoạch hoạt động/học kỳ/nhân sự/tài chính, 5–30 người sáng lập, thông tin liên hệ và cam kết. Mỗi người sáng lập có tên/nhiệm vụ và email hoặc điện thoại; người nộp phải xuất hiện trong danh sách. Backend xác minh lại mọi điều kiện.

## `client/src/pages/AdminClubApplications.jsx` và `MyClubApplications.jsx`

Trang Admin tải hồ sơ theo trạng thái, đọc kế hoạch và đội ngũ, phê duyệt/từ chối có ghi chú. Trang hồ sơ của tôi hiển thị trạng thái và phản hồi của Admin.

## E. Lệnh chạy trên PowerShell Windows

```powershell
# Terminal backend
cd server
Copy-Item .env.example .env
npm.cmd install
npm.cmd run seed
npm.cmd run dev

# Terminal frontend mới, từ thư mục gốc
cd client
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

Dùng `npm.cmd` nếu PowerShell chặn `npm.ps1` theo Execution Policy. Lệnh này gọi file npm.cmd trực tiếp, không cần nới chính sách script của Windows.

---

# Phần V3: xác thực đa phương thức và phê duyệt thành lập CLB

## `server/src/models/ClubApplication.js`

Đây là model lưu hồ sơ xin thành lập CLB. Không tạo `Club` ngay khi người dùng bấm gửi. Hồ sơ có các nhóm thông tin: tên/danh mục, giới thiệu, sứ mệnh, đối tượng, kế hoạch hoạt động, kế hoạch học kỳ, kế hoạch nhân sự, kế hoạch tài chính, danh sách 5–30 người sáng lập (mỗi người có email hoặc số điện thoại), thông tin liên hệ, cố vấn và cam kết.

`status` quản lý luồng `pending → processing → approved/rejected`. `reviewedBy`, `reviewedAt`, `reviewNote` ghi lại lịch sử xử lý; `createdClub` liên kết hồ sơ đã duyệt với CLB thật.

## `server/src/routes/clubApplication.routes.js`

- `POST /`: kiểm tra dữ liệu và lưu hồ sơ; người dùng phải đăng nhập.
- `GET /mine`: người nộp theo dõi hồ sơ của mình.
- `GET /admin`: Admin website xem hồ sơ theo trạng thái.
- `PATCH /:id/review`: chỉ Admin website được duyệt/từ chối.

Khi duyệt, backend tạo `Club`, tạo `Membership` có `role: owner` và `status: approved` cho người nộp, sau đó đánh dấu hồ sơ `approved`. Trường `User.role` không thay đổi: người nộp không trở thành Admin website. Thông tin kế hoạch và đội ngũ sáng lập được sao chép vào Club; API công khai chỉ trả tên/nhiệm vụ, không trả email hoặc số điện thoại cá nhân của từng sáng lập viên. Backend sử dụng trạng thái `processing` để giảm nguy cơ hai Admin xử lý cùng hồ sơ đồng thời; nếu bước tạo dữ liệu thất bại, backend thực hiện bù trừ và đưa hồ sơ về `pending`.

## `client/src/pages/ClubApplicationForm.jsx`

Form nhiều nhóm thông tin; `useState` lưu dữ liệu, `updateFounder` cập nhật đúng người sáng lập, thêm/xóa dòng người sáng lập; mỗi sáng lập viên khai báo email hoặc số điện thoại; các trường kế hoạch nhân sự và tài chính cũng bắt buộc. `required`, `minLength`, `type=email`, `pattern` cung cấp kiểm tra nhanh phía trình duyệt. Khi submit, `request('/club-applications', {method:'POST'})` gửi JSON đến backend. Kiểm tra frontend không thay thế kiểm tra phía backend.

## `client/src/pages/AdminClubApplications.jsx`

Dashboard dành cho Admin. Trang tải danh sách theo trạng thái, mở rộng để xem nội dung hồ sơ và đội ngũ sáng lập, gửi quyết định approve/reject và ghi chú xét duyệt. Backend mới là nơi có quyền quyết định cuối cùng.

## `client/src/pages/MyClubApplications.jsx`

Hiển thị hồ sơ của tài khoản hiện tại, thời gian gửi, trạng thái và ghi chú phản hồi. Nếu hồ sơ được duyệt, đường dẫn mở CLB được tạo.

## `server/src/routes/auth.routes.js`

- `/google`: nhận Google ID token; `OAuth2Client.verifyIdToken()` xác minh chữ ký, hạn token và audience; backend kiểm tra tiếp `email_verified`.
- `/facebook`: xác minh access token với Graph API; kiểm tra token thuộc đúng Facebook App.
- `/phone/send-otp`, `/phone/verify-otp`: gọi Twilio Verify; nhận `intent=register|login` để tách đăng ký và đăng nhập, kiểm tra tài khoản trước khi gửi OTP; OTP không được tự sinh hoặc xác nhận giả trong ứng dụng.
- `/google/link`, `/facebook/link`: liên kết tài khoản mạng xã hội vào tài khoản hiện đang đăng nhập.
- `/phone/link/send-otp`, `/phone/link/verify-otp`: xác minh và gắn số điện thoại vào tài khoản hiện tại.

## `client/src/pages/Auth.jsx`

Có hai tab Email và Số điện thoại. Trường mật khẩu chuyển `type` giữa `password` và `text` theo trạng thái `showPassword`; nút con mắt có `aria-label`. Google Identity Services trả ID token và backend xác minh bằng `google-auth-library`; Facebook SDK trả access token; số điện thoại gửi và xác minh OTP. UI chỉ hiển thị trạng thái chưa cấu hình khi thiếu Client ID/App ID; backend trả 503 nếu thiếu credentials của nhà cung cấp.

## `client/src/pages/Profile.jsx`

Người dùng xem các phương thức đã liên kết, cập nhật tên, liên kết số điện thoại bằng OTP và liên kết Google/Facebook khi đã đăng nhập. Việc liên kết Google/Facebook kiểm tra ID/access token ở backend, không nhận `providerId` do client tự khai báo.

## `client/src/context/AuthContext.jsx`

`acceptSession` nhận token sau OAuth hoặc xác minh OTP, lưu token, cập nhật user và đánh dấu phiên đăng nhập sẵn sàng. `updateCurrentUser` đồng bộ hồ sơ sau khi liên kết thêm phương thức đăng nhập.

## Tách quyền hệ thống và quyền CLB

- `User.role === 'admin'`: Admin toàn website; tài khoản người sáng lập nền tảng được tạo/cấu hình qua `SEED_ADMIN_EMAIL` trong `server/.env`.
- `Membership.role === 'owner'`: Chủ nhiệm một CLB cụ thể.
- `Membership.role === 'moderator'`: Điều phối viên trong CLB.
- `Membership.role === 'member'`: Thành viên.

Không được gán `User.role=admin` cho người nộp hồ sơ thành lập CLB. Chức danh Chủ nhiệm chỉ có hiệu lực trong CLB được duyệt.


## Phân biệt Admin toàn website và Admin CLB

- `User.role === 'admin'`: quyền hệ thống, do seed/người vận hành cấp; được mở Dashboard và duyệt thành lập CLB.
- `Membership.role === 'owner'`: Chủ nhiệm/Admin trong một CLB cụ thể; được quản lý thành viên và sự kiện của CLB đó.
- `Membership.role === 'moderator'`: Điều phối viên có một phần quyền quản lý trong CLB.
- Khi Admin website duyệt hồ sơ, người nộp có Membership `owner` trong CLB mới nhưng vẫn giữ `User.role='member'`. Không được tự nâng người nộp thành Admin toàn website.

Xem thêm `docs/QUY_TRINH_THANH_LAP_CLB.md` và `docs/CAU_HINH_DANG_NHAP.md`.
