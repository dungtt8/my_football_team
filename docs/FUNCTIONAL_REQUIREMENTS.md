# Tài liệu yêu cầu chức năng — Ứng dụng Quản lý Đội bóng

> Tài liệu này mô tả yêu cầu chức năng mục tiêu (target behavior) để đội dev dùng làm cơ sở rebuild hệ thống. Các vấn đề/khoảng trống phát hiện khi khảo sát code hiện tại (đăng nhập, OTP, quên mật khẩu...) đã được đặc tả lại theo đúng luồng nghiệp vụ cần có, không mô tả theo hiện trạng lỗi.

## 1. Tổng quan

Ứng dụng hỗ trợ quản lý một đội bóng phong trào, chạy trên Web và PWA (mobile), gồm các nhóm chức năng:

1. Xác thực & tài khoản
2. Quản lý đội & thành viên
3. Điểm danh buổi tập/trận
4. Chiến dịch thu quỹ
5. Quản lý quỹ đội (thu/chi)
6. Thông báo & tự động hoá
7. Quản trị hệ thống

## 2. Vai trò người dùng (Actor)

| Vai trò (giá trị lưu DB) | Mô tả | Phạm vi quyền |
|---|---|---|
| `owner` | Chủ đội — người tạo đội hoặc được chuyển giao quyền | Toàn quyền trên đội: cấu hình, quản lý thành viên, duyệt quỹ, duyệt chiến dịch |
| `co_manager` | Quản lý phụ, được owner chỉ định | Tạo buổi tập, tạo chiến dịch, duyệt giao dịch quỹ/đóng góp — **không** được đổi cấu hình đội hay xoá owner |
| `member` | Thành viên thường | Điểm danh, đóng góp chiến dịch, tạo giao dịch thu/chi (ở trạng thái chờ duyệt), xem thông tin chung |

Ghi chú:
- Một người dùng (`users`) có thể thuộc nhiều đội (`team_members`) với vai trò khác nhau ở mỗi đội — luôn có một **đội đang hoạt động (active team)** được chọn cho phiên làm việc hiện tại.
- Mỗi đội chỉ có **duy nhất một owner** tại một thời điểm.

## 3. Danh sách Use Case

### 3.1. Xác thực & Tài khoản

---

**UC-01: Đăng nhập bằng Zalo**

- **Actor**: Người dùng chưa đăng nhập
- **Mô tả**: Đăng nhập/đăng ký nhanh thông qua tài khoản Zalo (OAuth), phù hợp vì ứng dụng chạy dạng Mini App/PWA trong hệ sinh thái Zalo.
- **Điều kiện tiên quyết**: Người dùng có tài khoản Zalo hợp lệ.
- **Luồng chính**:
  1. Người dùng bấm "Đăng nhập bằng Zalo".
  2. Hệ thống chuyển hướng tới trang cấp quyền OAuth của Zalo.
  3. Zalo trả về `code`/`access_token` qua callback.
  4. Hệ thống lấy thông tin hồ sơ Zalo (id, tên, avatar).
  5. Nếu `zalo_id` **chưa tồn tại** trong bảng `users` → tạo user mới với thông tin từ Zalo.
  6. Nếu **đã tồn tại** → lấy user hiện có, cập nhật avatar/tên nếu thay đổi.
  7. Hệ thống phát hành access token (JWT) + refresh token, trả về cho client.
- **Luồng ngoại lệ**:
  - Zalo trả về lỗi/từ chối cấp quyền → hiển thị thông báo lỗi, quay lại màn hình đăng nhập.
  - Token Zalo hết hạn/không hợp lệ → trả lỗi 401.
- **Quy tắc nghiệp vụ**: Không được tạo user trùng `zalo_id`. Việc tạo user phải là thao tác ghi thật vào DB (không dùng dữ liệu giả lập).

---

**UC-02: Đăng nhập/Đăng ký bằng số điện thoại + OTP**

- **Actor**: Người dùng chưa đăng nhập
- **Mô tả**: Đăng nhập cho người dùng không qua Zalo, xác thực quyền sở hữu số điện thoại bằng mã OTP gửi qua SMS.
- **Điều kiện tiên quyết**: Người dùng có số điện thoại nhận được SMS.
- **Luồng chính**:
  1. Người dùng nhập số điện thoại, bấm "Gửi mã OTP".
  2. Hệ thống sinh mã OTP 6 số, lưu tạm (kèm thời gian hết hạn ~5 phút) gắn với số điện thoại, gửi qua SMS provider.
  3. Người dùng nhập mã OTP nhận được.
  4. Hệ thống xác thực mã: đúng & còn hạn → tiếp tục; nếu số điện thoại chưa có tài khoản, yêu cầu nhập thêm họ tên để tạo tài khoản mới.
  5. Hệ thống tạo/lấy user, phát hành access token + refresh token.
- **Luồng ngoại lệ**:
  - Nhập sai OTP quá 5 lần → khoá thao tác xác thực với số điện thoại đó trong 15 phút.
  - OTP hết hạn → yêu cầu gửi lại (giới hạn tối đa 1 lần gửi/60 giây để chống spam SMS).
- **Quy tắc nghiệp vụ**: Không được cấp token nếu chưa xác thực OTP thành công — đây là lỗi bảo mật nghiêm trọng cần đảm bảo không lặp lại khi rebuild.

---

**UC-03: Quên mật khẩu / Đặt lại mật khẩu**

- **Actor**: Người dùng đã có tài khoản (đăng nhập bằng mật khẩu, nếu hệ thống hỗ trợ đăng nhập bằng mật khẩu cho tài khoản SĐT)
- **Mô tả**: Cho phép người dùng lấy lại quyền truy cập khi quên mật khẩu, thông qua xác thực lại số điện thoại bằng OTP.
- **Luồng chính**:
  1. Người dùng chọn "Quên mật khẩu", nhập số điện thoại đã đăng ký.
  2. Hệ thống gửi OTP xác nhận qua SMS.
  3. Người dùng nhập OTP đúng.
  4. Hệ thống cho phép nhập mật khẩu mới (kèm xác nhận mật khẩu).
  5. Hệ thống mã hoá (hash) và lưu mật khẩu mới, vô hiệu hoá các phiên đăng nhập cũ (tuỳ chọn).
- **Luồng ngoại lệ**: Số điện thoại không tồn tại trong hệ thống → thông báo lỗi chung chung (không tiết lộ số đã đăng ký hay chưa, tránh dò quét tài khoản).
- **Ghi chú kỹ thuật cho rebuild**: Chức năng này cần được xây dựng đầy đủ trên backend chính thức (không chỉ tồn tại ở bản cũ), dùng chung cơ chế OTP với UC-02.

---

**UC-04: Cập nhật hồ sơ cá nhân**

- **Actor**: Tất cả người dùng đã đăng nhập
- **Mô tả**: Chỉnh sửa thông tin cá nhân của chính mình.
- **Luồng chính**:
  1. Người dùng vào màn hình "Hồ sơ cá nhân".
  2. Chỉnh sửa: họ tên hiển thị, số điện thoại, ảnh đại diện.
  3. Bấm "Lưu" → hệ thống validate và cập nhật.
- **Chức năng con**:
  - **Đổi mật khẩu**: yêu cầu nhập mật khẩu hiện tại + mật khẩu mới (2 lần xác nhận).
  - **Đổi số áo trong đội hiện tại**: kiểm tra số áo chưa bị thành viên khác trong cùng đội sử dụng.
- **Quy tắc nghiệp vụ**: Số điện thoại là định danh đăng nhập → khi đổi số điện thoại phải xác thực lại qua OTP.

---

**UC-05: Gửi phản hồi/góp ý ứng dụng**

- **Actor**: Tất cả người dùng đã đăng nhập
- **Mô tả**: Cho phép người dùng gửi góp ý, báo lỗi trực tiếp trong ứng dụng tới đội ngũ vận hành.
- **Luồng chính**:
  1. Người dùng vào Menu → "Gửi phản hồi".
  2. Nhập nội dung góp ý (bắt buộc), đính kèm ảnh chụp màn hình (tuỳ chọn).
  3. Gửi → hệ thống lưu phản hồi kèm thông tin người gửi, đội hiện tại, thời điểm gửi.
- **Ghi chú cho rebuild**: Nên có API lưu phản hồi vào hệ thống (bảng `feedbacks` hoặc tương đương) thay vì chỉ dẫn ra biểu mẫu ngoài (Google Form), để dễ tra cứu, thống kê và phản hồi lại người dùng trong app.

### 3.2. Quản lý Đội (Team)

---

**UC-06: Tạo đội mới**

- **Actor**: Người dùng đã đăng nhập (bất kỳ)
- **Mô tả**: Khởi tạo một đội bóng mới trên hệ thống.
- **Luồng chính**:
  1. Người dùng nhập tên đội, ảnh đại diện đội (tuỳ chọn).
  2. Hệ thống tạo bản ghi `teams` mới, gán người tạo làm `owner`.
  3. Hệ thống sinh mã mời (`invite_code`) duy nhất, ngẫu nhiên, dễ đọc (VD: 6-8 ký tự).
  4. Đội mới được tự động chọn làm đội đang hoạt động của người dùng.
- **Quy tắc nghiệp vụ**: `invite_code` phải duy nhất toàn hệ thống và có thể tái tạo (regenerate) bởi owner.

---

**UC-07: Tham gia đội bằng mã mời**

- **Actor**: Người dùng đã đăng nhập
- **Mô tả**: Gia nhập một đội đã tồn tại bằng mã mời do owner/co-manager cung cấp.
- **Luồng chính**:
  1. Người dùng nhập mã mời.
  2. Hệ thống kiểm tra mã hợp lệ, đội chưa bị xoá.
  3. Tạo bản ghi `team_members` với `role = member`, `status = active`.
  4. Người dùng được thêm ngay vào đội (không cần duyệt), có thể chuyển đội này thành đội đang hoạt động.
- **Luồng ngoại lệ**:
  - Mã mời không tồn tại/đã hết hạn → báo lỗi.
  - Người dùng đã là thành viên đội đó → báo đã tham gia, không tạo bản ghi trùng.
- **Yêu cầu làm rõ cho rebuild**: Xác nhận với chủ dự án liệu có cần cơ chế "owner duyệt thành viên mới" hay giữ nguyên tự động tham gia (hiện tại là tự động).

---

**UC-08: Chuyển đội đang hoạt động (Active Team)**

- **Actor**: Người dùng thuộc từ 2 đội trở lên
- **Mô tả**: Chọn đội sẽ thao tác trong phiên làm việc hiện tại — toàn bộ dữ liệu hiển thị (điểm danh, quỹ, chiến dịch) phụ thuộc vào đội đang hoạt động.
- **Luồng chính**:
  1. Người dùng mở danh sách các đội mình tham gia.
  2. Chọn 1 đội khác → hệ thống cập nhật `active_team_id` cho phiên/user.
  3. Toàn bộ màn hình reload dữ liệu theo đội mới chọn.

---

**UC-09: Quản lý danh sách thành viên**

- **Actor**: `owner`, `co_manager`
- **Mô tả**: Xem, phân quyền và quản lý trạng thái thành viên trong đội.
- **Luồng chính**:
  1. Xem danh sách thành viên: tên, số áo, vai trò, trạng thái, ngày tham gia.
  2. Đổi vai trò: `owner` có thể thăng/giáng `member` ↔ `co_manager`. `co_manager` **không** được đổi vai trò người khác.
  3. Vô hiệu hoá thành viên (`status = inactive`): thành viên mất quyền truy cập đội nhưng lịch sử dữ liệu (điểm danh, đóng góp) được giữ nguyên.
  4. Xoá thành viên khỏi đội: chỉ cho phép khi không có ràng buộc dữ liệu quan trọng đang chờ xử lý (VD: đang có giao dịch/đóng góp chưa duyệt) — cần xác nhận rõ ràng (dialog cảnh báo).
- **Quy tắc nghiệp vụ**: Không được xoá hoặc hạ quyền `owner` duy nhất của đội. Chuyển giao quyền owner là một hành động riêng, cần xác nhận 2 bước.

---

**UC-10: Cấu hình đội**

- **Actor**: `owner`
- **Mô tả**: Thiết lập các thông số vận hành của đội.
- **Các mục cấu hình**:
  - Mã mời (`invite_code`) — xem/regenerate.
  - Mã QR nhận quỹ (ảnh QR chuyển khoản ngân hàng) — upload/thay đổi.
  - Số tiền quỹ đội định kỳ hàng tháng (`team_fund_amount`).
  - Kỳ chốt sổ quỹ: ngày bắt đầu/kết thúc thu quỹ trong tháng (`finance_payment_start_day`, `finance_payment_end_day`).
  - Lịch tập định kỳ: tần suất và các ngày trong tuần (`session_frequency`, `session_days`) để hệ thống tự sinh buổi tập.
- **Quy tắc nghiệp vụ**: Thay đổi `team_fund_amount` chỉ áp dụng cho các kỳ quỹ **tạo mới sau đó**, không hồi tố các chiến dịch quỹ tháng đã tạo.

### 3.3. Điểm danh (Attendance)

---

**UC-11: Tạo/Sửa/Đóng buổi tập, trận đấu**

- **Actor**: `owner`, `co_manager`
- **Mô tả**: Quản lý lịch buổi tập/trận đấu của đội.
- **Luồng chính**:
  1. Tạo buổi: nhập thời gian bắt đầu, địa điểm, loại buổi (tập/trận), ghi chú.
  2. Sửa buổi: chỉnh sửa thông tin khi buổi chưa diễn ra.
  3. Đóng buổi: sau khi buổi kết thúc, đánh dấu hoàn tất để chốt số liệu điểm danh, tính điểm chuyên cần.
- **Quy tắc nghiệp vụ**: Không cho sửa/xoá buổi đã đóng (đã chốt điểm danh).

---

**UC-12: Điểm danh tự động theo lịch định kỳ**

- **Actor**: Hệ thống (tự động)
- **Mô tả**: Dựa trên cấu hình lịch tập của đội (UC-10), hệ thống tự động sinh buổi tập mới và mở điểm danh theo chu kỳ, giảm thao tác thủ công cho quản lý đội.
- **Luồng chính**:
  1. Theo lịch cron hàng ngày, hệ thống kiểm tra các đội có cấu hình `session_frequency`/`session_days` khớp ngày hôm nay (hoặc trước N ngày để mở sớm).
  2. Tự động tạo buổi tập mới, trạng thái điểm danh mở (member có thể phản hồi ngay).
- **Yêu cầu bổ sung cho rebuild**: Nên có thêm khả năng cho `owner`/`co_manager` **mở điểm danh thủ công** cho buổi bất kỳ (kể cả buổi phát sinh đột xuất không theo lịch định kỳ), không chỉ phụ thuộc hoàn toàn vào tự động hoá.

---

**UC-13: Phản hồi tham gia (Check-in)**

- **Actor**: `member` (và `co_manager`, `owner` với tư cách thành viên)
- **Mô tả**: Xác nhận có tham gia hay vắng mặt cho một buổi tập đang mở điểm danh.
- **Luồng chính**:
  1. Thành viên nhận thông báo buổi tập mới (qua Zalo/thông báo trong app).
  2. Vào màn hình điểm danh, chọn "Tham gia" hoặc "Vắng mặt" (có thể kèm lý do vắng).
  3. Hệ thống ghi nhận `attendance_checkins` gắn với buổi và user.
- **Quy tắc nghiệp vụ**: Cho phép đổi phản hồi trước thời điểm buổi tập diễn ra; không cho đổi sau khi buổi đã đóng (UC-11).

---

**UC-14: Xem lịch sử & thống kê điểm danh**

- **Actor**: Tất cả thành viên đội
- **Mô tả**: Theo dõi lịch sử tham gia và mức độ chuyên cần.
- **Nội dung hiển thị**:
  - Danh sách buổi tập đã diễn ra, số người tham gia/vắng.
  - Tỷ lệ tham gia của bản thân theo tháng/theo mùa.
  - Bảng xếp hạng chuyên cần (leaderboard) toàn đội, có thể lưu trữ theo từng tháng để so sánh.

### 3.4. Chiến dịch thu quỹ (Campaign)

---

**UC-15: Tạo chiến dịch thu quỹ**

- **Actor**: `owner`, `co_manager`
- **Mô tả**: Tạo một đợt vận động thu tiền từ thành viên cho một mục đích cụ thể.
- **Loại chiến dịch**:
  - `team_fund`: quỹ đội định kỳ hàng tháng (có thể tạo tự động — xem UC-23).
  - Loại thông thường: chiến dịch phát sinh (mua đồ, tổ chức sự kiện, liên hoan...).
- **Luồng chính**:
  1. Nhập tên chiến dịch, số tiền mỗi thành viên phải đóng (`amount_per_member`), hạn đóng.
  2. Chọn danh sách thành viên áp dụng (mặc định toàn bộ thành viên `active`).
  3. Hệ thống tạo `campaigns` + tự động sinh `campaign_assignments` (mỗi thành viên 1 dòng, trạng thái `pending_confirmation`).
  4. Hệ thống gửi thông báo cho các thành viên liên quan.

---

**UC-16: Đóng góp và xác nhận thanh toán**

- **Actor**: `member`
- **Mô tả**: Thành viên xác nhận đã chuyển khoản đóng góp cho chiến dịch.
- **Luồng chính**:
  1. Thành viên xem chiến dịch đang chờ đóng góp, quét mã QR quỹ đội (UC-10) để chuyển khoản.
  2. Upload ảnh biên lai/minh chứng chuyển khoản.
  3. Bấm "Xác nhận đã đóng" → cập nhật `campaign_assignments.status = confirmed`, chờ duyệt.
- **Luồng ngoại lệ**: Thành viên có thể huỷ xác nhận trước khi được duyệt để sửa lại minh chứng.

---

**UC-17: Duyệt/Từ chối/Miễn đóng góp**

- **Actor**: `owner`, `co_manager`
- **Mô tả**: Xác minh minh chứng đóng góp của thành viên.
- **Luồng chính**:
  1. Xem danh sách đóng góp đang chờ duyệt (`status = confirmed`) kèm ảnh minh chứng.
  2. **Duyệt**: cập nhật `status = approved`, ghi `approved_amount`, `approved_at`, tạo bút toán thu tương ứng vào quỹ đội.
  3. **Từ chối**: cập nhật `status = rejected` kèm lý do, thành viên phải xác nhận lại.
  4. **Miễn đóng góp** (`exempt`): áp dụng cho trường hợp đặc biệt (VD: thành viên nghỉ dài hạn) — set `status = exempt`, `exempt_reason`, `exempt_at`, không tính vào công nợ.

---

**UC-18: Đóng chiến dịch & xem báo cáo**

- **Actor**: `owner`, `co_manager`
- **Mô tả**: Kết thúc một chiến dịch, tổng kết kết quả thu quỹ.
- **Luồng chính**:
  1. Đóng chiến dịch (`status = closed`) khi hết hạn đóng hoặc thủ công.
  2. Xem báo cáo: tổng số tiền đã thu/đã duyệt, danh sách còn thiếu, danh sách được miễn.
- **Quy tắc nghiệp vụ**: Chiến dịch đã đóng không nhận thêm đóng góp mới; các đóng góp đang chờ duyệt vẫn xử lý được.

### 3.5. Quản lý Quỹ đội (Finance)

---

**UC-19: Tạo giao dịch thu/chi**

- **Actor**: `member`, `co_manager`, `owner`
- **Mô tả**: Ghi nhận một khoản thu hoặc chi cho quỹ đội (ngoài các khoản thu tự động từ chiến dịch).
- **Luồng chính**:
  1. Chọn loại giao dịch: Thu (`income`) / Chi (`expense`).
  2. Nhập số tiền, mô tả, ngày giao dịch, ảnh hoá đơn/minh chứng.
  3. Gửi → trạng thái mặc định `pending`, chờ duyệt.
- **Quy tắc nghiệp vụ**: Số tiền phải > 0; bắt buộc có minh chứng (ảnh) để đảm bảo minh bạch.

---

**UC-20: Duyệt/Từ chối giao dịch**

- **Actor**: `owner`, `co_manager`
- **Mô tả**: Xác minh và phê duyệt giao dịch trước khi tính vào số dư quỹ chính thức.
- **Luồng chính**:
  1. Xem danh sách giao dịch `pending`.
  2. Duyệt → `status = approved`, cộng/trừ vào số dư quỹ, ghi log biến động (`fund_balance_logs`).
  3. Từ chối → `status = rejected` kèm lý do, không ảnh hưởng số dư.

---

**UC-21: Xem số dư và lịch sử biến động quỹ**

- **Actor**: Tất cả thành viên đội
- **Mô tả**: Minh bạch hoá tình hình tài chính đội.
- **Nội dung hiển thị**: Số dư hiện tại, tổng thu, tổng chi, danh sách giao dịch đã duyệt theo thời gian (có thể lọc theo loại, khoảng ngày).

---

**UC-22: Xem biểu đồ thu/chi theo tháng**

- **Actor**: Tất cả thành viên đội
- **Mô tả**: Biểu đồ trực quan (cột/đường) thể hiện tổng thu, tổng chi theo từng tháng trong N tháng gần nhất (mặc định 6 tháng, tối đa 24 tháng).
- **Yêu cầu kỹ thuật**: API trả về mảng đủ N tháng liên tiếp (tháng không có giao dịch vẫn hiển thị giá trị 0), sắp xếp từ cũ đến mới, chỉ tính các giao dịch đã duyệt (`status = approved`).

---

**UC-23: Tự động tạo quỹ tháng (Auto team fund)**

- **Actor**: Hệ thống (tự động, chạy theo lịch đầu mỗi tháng)
- **Mô tả**: Với các đội đã cấu hình `team_fund_amount`, hệ thống tự động tạo một chiến dịch quỹ tháng mới (`campaign_type = team_fund`) và gán cho toàn bộ thành viên đang hoạt động.
- **Luồng chính**:
  1. Đầu mỗi tháng, hệ thống quét các đội có `team_fund_amount > 0`.
  2. Nếu chưa có chiến dịch quỹ tháng cho tháng hiện tại → tạo mới, `created_by = owner_id` của đội (đảm bảo có người chịu trách nhiệm hợp lệ, không để trống).
  3. Tự động tạo `campaign_assignments` cho toàn bộ thành viên `active`.
  4. Gửi thông báo nhắc đóng quỹ tháng.
- **Quy tắc nghiệp vụ**: Không tạo trùng chiến dịch quỹ tháng cho cùng một đội trong cùng một tháng.

### 3.6. Thông báo & Tự động hoá

---

**UC-24: Thông báo qua Zalo (ZNS) & Webhook**

- **Actor**: Hệ thống, Zalo OA
- **Mô tả**: Gửi thông báo chủ động tới người dùng qua kênh Zalo (nhắc điểm danh, nhắc đóng quỹ, kết quả duyệt...) và tiếp nhận sự kiện/tin nhắn từ Zalo OA qua webhook.
- **Yêu cầu kỹ thuật**: Webhook phải xác thực chữ ký (signature) từ Zalo để chống giả mạo request.

---

**UC-25: Thông báo nội bộ trong ứng dụng**

- **Actor**: Hệ thống, tất cả người dùng
- **Mô tả**: Hiển thị thông báo trong app khi có sự kiện liên quan tới người dùng: giao dịch/đóng góp được duyệt hoặc từ chối, chiến dịch mới, buổi tập mới, nhắc hạn đóng quỹ.

---

**UC-26: Nhắc hạn đóng quỹ**

- **Actor**: Hệ thống (tự động)
- **Mô tả**: Gửi nhắc nhở cho thành viên chưa đóng góp khi gần tới hoặc đã quá hạn kỳ chốt sổ quỹ (UC-10).

---

**UC-27: Tính điểm & xếp hạng chuyên cần (Gamification)**

- **Actor**: Hệ thống, tất cả thành viên
- **Mô tả**: Tính điểm dựa trên tần suất tham gia điểm danh, lưu trữ và hiển thị bảng xếp hạng theo tháng để tạo động lực tham gia.

---

**UC-28: Lưu trữ tệp tin (ảnh hoá đơn, biên lai, QR quỹ, avatar)**

- **Actor**: Hệ thống (dịch vụ nền)
- **Mô tả**: Nhận, lưu trữ và cung cấp URL truy cập cho các ảnh được upload từ các use case khác (UC-16, UC-19, UC-10, UC-04).
- **Yêu cầu kỹ thuật**: Giới hạn dung lượng/loại file, có cơ chế xoá file không còn được tham chiếu.

### 3.7. Quản trị hệ thống

---

**UC-29: Dashboard quản trị đội**

- **Actor**: `owner`, `co_manager`
- **Mô tả**: Trang tổng hợp giúp người quản lý xử lý nhanh các việc đang chờ: giao dịch quỹ chờ duyệt, đóng góp chiến dịch chờ duyệt, tổng quan số dư quỹ hiện tại.

---

**UC-30: Health check hệ thống**

- **Actor**: Hệ thống vận hành (DevOps/monitoring)
- **Mô tả**: Endpoint kiểm tra tình trạng hoạt động của backend, phục vụ giám sát uptime.

## 4. Yêu cầu phi chức năng

- **Đa nền tảng**: Giao diện chạy tốt trên Web và PWA (mobile), thiết kế responsive, cài đặt được như app trên màn hình chính điện thoại.
- **Đơn giản**: Ưu tiên luồng thao tác tối giản, không thêm tính năng ngoài yêu cầu; tránh over-engineering khi rebuild.
- **Bảo mật xác thực**: Không được cấp token truy cập khi chưa xác thực OTP/Zalo hợp lệ (xem UC-01, UC-02); mật khẩu phải được hash, không lưu plaintext.
- **Phân quyền rõ ràng**: Mọi thao tác duyệt (quỹ, chiến dịch, thành viên) chỉ `owner`/`co_manager` thực hiện được; áp dụng kiểm tra quyền ở tầng API (không chỉ ẩn UI).
- **Minh bạch tài chính**: Mọi giao dịch quỹ/đóng góp đều phải có minh chứng (ảnh) và lưu lịch sử thay đổi số dư, không cho sửa/xoá sau khi đã duyệt.
- **Nhất quán dữ liệu đội**: Toàn bộ dữ liệu nghiệp vụ (điểm danh, quỹ, chiến dịch) phải phân vùng theo `team_id`, không rò rỉ dữ liệu giữa các đội khác nhau.
- **Khả năng mở rộng**: Kiến trúc single-backend (khuyến nghị chỉ giữ một backend chính thức khi rebuild, tránh duy trì song song 2 hệ thống backend như hiện tại) để giảm rủi ro thiếu đồng bộ tính năng.

## 5. Bảng tổng hợp Actor × Use Case

| Nhóm chức năng | Owner | Co-manager | Member | Hệ thống |
|---|:---:|:---:|:---:|:---:|
| Đăng nhập/Tài khoản (UC-01→05) | ✔ | ✔ | ✔ | — |
| Tạo/cấu hình đội (UC-06,08,10) | ✔ | — | — | — |
| Quản lý thành viên (UC-07,09) | ✔ | Một phần | Tham gia | — |
| Điểm danh (UC-11→14) | ✔ | ✔ | Phản hồi/xem | Tự động (UC-12) |
| Chiến dịch (UC-15,17,18) | ✔ | ✔ | Đóng góp (UC-16) | Tự động (UC-23) |
| Quỹ đội (UC-19→22) | Duyệt | Duyệt | Tạo/xem | — |
| Thông báo/tự động hoá (UC-24→28) | Xem | Xem | Xem | Chủ yếu |
| Quản trị (UC-29,30) | ✔ | Một phần | — | Monitoring |
