# TÀI LIỆU ĐẶC TẢ YÊU CẦU NGƯỜI DÙNG (USER REQUIREMENTS SPECIFICATION - URS)

**Dự án:** Nền tảng SaaS Quản lý Đội bóng Phong trào Toàn diện

**Đơn vị thực hiện:** Chuyên gia Phân tích Nghiệp vụ (Professional BA)

**Phiên bản:** 1.1 (Tài liệu kỹ thuật chuẩn hóa bàn giao Đội ngũ Phát triển - Cập nhật Module Khoản thu đột xuất)

**Ngày thiết lập:** Tháng 06, 2026

---

## I. TỔNG QUAN & KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Hệ thống được thiết kế theo mô hình **SaaS Multi-tenancy** phân tách dữ liệu logic bằng `Tenant_ID`. Mỗi đội bóng khi đăng ký sẽ vận hành như một không gian (Tenant) độc lập, sử dụng chung cơ sở hạ tầng nhưng bảo mật dữ liệu tuyệt đối.

### 1. Giải pháp đa nền tảng không cài đặt (PWA Deployment)

* **Công nghệ Frontend:** Sử dụng Next.js/ReactJS tối ưu hóa Mobile-First.
* **Cơ chế Web App Manifest:** Cấu hình file `manifest.json` chuẩn hóa để hiển thị pop-up "Thêm vào màn hình chính" (Add to Home Screen) trên cả iOS (Safari) và Android (Chrome).
* **Service Workers:** Đóng gói mã nguồn để chạy ngầm, hỗ trợ bộ nhớ đệm (Caching) giúp tải trang tức thì và lưu trữ ngoại tuyến (Offline-first) bằng IndexedDB khi người dùng mất kết nối tại sân bóng.

### 2. Chiến lược tích hợp trục thông báo Zalo OA

* Hệ thống không sử dụng ứng dụng Native nên việc đẩy thông báo (Push Notification) trên iOS bị hạn chế nếu người dùng không bật shortcut. Giải pháp thay thế cốt lõi là **Tích hợp Zalo OA (Official Account)**.
* **Cơ chế định danh:** Khi Onboarding, người dùng đăng nhập bằng **Zalo Social Login**. Hệ thống sẽ bắt Webhook sự kiện `follow` từ Zalo OA để đồng bộ dữ liệu giữa ba thực thể:

$$\text{User\_ID (Hệ thống)} \Longleftrightarrow \text{Zalo\_User\_ID (ZUID)} \Longleftrightarrow \text{Tenant\_ID (Đội bóng)}$$


* **Tối ưu hóa chi phí:** Tận dụng tối đa *Tin nhắn tiện ích (Utility Messages)* và *Tin nhắn tương tác nội bộ trong vòng 48 giờ* để gửi thông báo tự động (Điểm danh, Nhắc nợ quỹ) mà không phát sinh chi phí tin nhắn chủ động (ZNS).

---

## II. MA TRẬN PHÂN QUYỀN NGƯỜI DÙNG (RBAC MATRIX)

Hệ thống quản lý phân quyền chặt chẽ dựa trên vai trò (Role-Based Access Control) để đảm bảo tính toàn vẹn của dữ liệu thu chi và chỉ số chuyên môn:

| Module tính năng | System Admin (Hệ thống) | Team Owner (Lãnh đội) | Co-Manager (Quản lý cấp 2) | Member (Thành viên) |
| --- | --- | --- | --- | --- |
| Quản lý vòng đời Tenant (Khóa/Mở đội) | **X** |  |  |  |
| Cấu hình thông tin đội, gắn VietQR |  | **X** |  |  |
| Chỉ định / Bãi nhiệm Quản lý cấp 2 |  | **X** |  |  |
| Khởi tạo chiến dịch thu quỹ/Khoản thu khác |  | **X** | **X** |  |
| Phê duyệt giao dịch Quỹ & Chỉ số (Checker) |  | **X** | **X** |  |
| Submit bằng chứng đóng tiền (Maker) |  | **X** | **X** | **X** |
| Điểm danh, tự cập nhật chỉ số cá nhân |  | **X** | **X** | **X** |

---

## III. ĐẶC TẢ CHI TIẾT CÁC MODULE NGHIỆP VỤ (FUNCTIONAL REQUIREMENTS)

### 1. Module Tài Chính & Phê Duyệt 2 Cấp Định Kỳ (Monthly Fund - Maker/Checker)

* **Mô tả:** Quản lý dòng tiền quỹ định kỳ hàng tháng của đội bóng một cách minh bạch, tự động hóa khâu nhắc nhở và đối soát.
* **Quy tắc nghiệp vụ (Business Rules):**
* Lãnh đội cấu hình số tiền cố định/tháng và thông tin tài khoản ngân hàng nhận tiền.
* Hệ thống tự động sinh mã **VietQR động** chứa sẵn: *Số tài khoản + Số tiền quỹ + Nội dung chuyển khoản định danh dạng cấu trúc*: `[TENANT_ID] [USER_ID] [THANG]`.


* **Luồng xử lý dữ liệu (Data Flow):**
1. **Hàng tháng (Cron Job):** Hệ thống tự quét trạng thái thành viên vào ngày cấu hình $\rightarrow$ Gọi API Zalo OA bắn tin nhắc đóng quỹ kèm Deep link mở thẳng PWA đến màn hình đóng tiền.
2. **Thành viên (Maker):** Quét mã VietQR $\rightarrow$ Chuyển khoản qua App Ngân hàng $\rightarrow$ Chụp bill gửi lên PWA. Giao dịch được lưu ở trạng thái `Pending`.
3. **Thông báo:** Hệ thống đẩy tin nhắn Zalo OA đến Owner và Co-Manager báo hiệu có giao dịch chờ duyệt.
4. **Quản lý (Checker):** Đối soát tài khoản thực tế $\rightarrow$ Nhấn `Approve` hoặc `Reject` (Kèm lý do). Nếu `Approve`, hệ thống thực hiện đồng thời:
* Cập nhật trạng thái giao dịch thành `Approved`.
* Tăng số dư quỹ tồn chung của đội bóng (`current_fund_balance`).
* Ghi nhận thành viên đã hoàn thành quỹ tháng.





---

### 2. Module Khoản Thu Đột Xuất (Ad-hoc Fund Campaigns)

* **Mô tả:** Cho phép cấp quản lý tạo các chiến dịch thu tiền ngoài quỹ cố định (Ví dụ: Tiền làm áo đấu, lệ phí giải đấu, liên hoan...).

```
[Quản lý tạo Khoản thu] ──> [Chọn cấu hình đối tượng & dòng tiền] ──> [Zalo OA tự động nhắc nợ] ──> [Đối soát & Phê duyệt tách biệt]

```

* **Quy tắc nghiệp vụ mở rộng (Business Rules):**
* **Cấu hình đối tượng linh hoạt:** Khi tạo khoản thu, Quản lý có quyền chọn áp dụng cho **toàn đội (100% member)** HOẶC **chọn tích (check-list) những thành viên cụ thể** tham gia sự kiện đó.
* **Phân loại dòng tiền (Cashflow Category):** Lãnh đội có quyền cấu hình khoản thu này có được **cộng gộp vào Tổng Quỹ Đội** hay không.
* *Option A (Cộng gộp):* Tiền thu về sẽ hòa chung vào dòng tiền tổng của đội bóng.
* *Option B (Quỹ mục tiêu riêng):* Tiền thu về được ghi nhận riêng theo chiến dịch để chi thẳng cho nhà cung cấp (Ví dụ: Thanh toán tiền in áo), không làm sai lệch số dư quỹ vận hành sân bãi hàng tháng.


* **Cơ chế nhắc nợ tự động:** Hệ thống dựa vào cấu hình `deadline` của chiến dịch thu, chạy Cron Job trước hạn 24 giờ để lọc ra danh sách thành viên đang có trạng thái `unpaid` và tự động gửi tin nhắn Zalo OA "Nhắc nợ" đích danh.



---

### 3. Engine Điểm Danh Tự Động & Thuật Toán Vinh Danh (Automated Attendance & Gamification)

* **Mô tả:** Tự động hóa khâu chốt danh sách nhân sự đi đá bóng hàng tuần, xây dựng cơ chế Game hóa (Gamification) để tăng tính kỷ luật.
* **Luồng xử lý kỹ thuật:**
* **Gửi thông báo:** Cron Job tự động kích hoạt trước giờ lăn bóng $X$ ngày (do Lãnh đội tự setup thông số $X$). Hệ thống gửi tin nhắn tương tác qua Zalo OA yêu cầu thành viên bấm xác nhận: `Có` / `Không` / `Đi muộn`.
* **Khóa Deadline:** Hệ thống tự động chuyển trạng thái sự kiện sang `Locked` trước giờ bóng lăn $Y$ giờ (do Lãnh đội cấu hình). Sau thời gian này, thành viên không thể thay đổi trạng thái điểm danh.
* **Thuật toán bảng xếp hạng (Leaderboard Algorithm):** Chạy vào 23:59 ngày cuối cùng của tháng để tính toán dữ liệu:
* *Tiêu chí chuyên cần:* Sắp xếp theo tổng số trận có trạng thái điểm danh là `Có` và thực tế ra sân từ cao xuống thấp.
* *Tiêu chí tốc độ (Vinh danh phản hồi sớm):* Tính toán bằng khoảng thời gian delta $\Delta t$ của từng thành viên trong tháng:

$$\Delta t = t_{\text{User phản hồi}} - t_{\text{Hệ thống gửi thông báo}}$$



Thành viên có tổng $\Delta t$ thấp nhất tháng (phản hồi nhanh nhất sau khi nhận tin Zalo) và đi đủ trận sẽ được vinh danh đứng đầu bảng xếp hạng tháng.
* *Kỷ luật:* Thống kê các trường hợp chọn `Có` nhưng vắng mặt không lý do, hoặc phản hồi muộn sau Deadline để hệ thống tự động đề xuất mức phạt quỹ (nếu có cấu hình).





---

### 4. Module Chỉ Số Chuyên Môn Trận Đấu & Báo Cáo (Match Stats & Metrics)

* **Mô tả:** Lưu trữ biên niên sử của đội bóng và hồ sơ năng lực (Profile) của từng cầu thủ.
* **Quy trình Phê duyệt Chỉ số (Maker - Checker):**
1. Kết thúc trận đấu, Lãnh đội nhập kết quả tỷ số tổng (Ví dụ: FC Đội Bóng 5 - 3 FC Đối Đối).
2. Thành viên tự truy cập vào trận đấu để nhập chỉ số cá nhân của mình: Số bàn thắng (Goals), Số kiến tạo (Assists). Trạng thái record lúc này là `Pending_Stats`.
3. Chỉ số này **bắt buộc** phải được Owner hoặc Co-Manager nhấn `Approve` duyệt để tránh tình trạng thành viên spam hoặc khai khống số liệu. Sau khi duyệt, hệ thống mới ghi nhận vào thẻ cầu thủ và bảng xếp hạng danh hiệu (Vua phá lưới/Vua kiến tạo) của đội.



---

### 5. Module Mở Rộng: Mạng Lưới Liên Đội (Cross-Team SaaS Pool)

* **Mô tả:** Tổng hợp dữ liệu từ các Tenant độc lập để tạo thành hệ sinh thái kết nối giao hữu.
* **Cơ chế chia sẻ dữ liệu (Data Sharing):**
* Hệ thống thiết lập một Data Pool trung tâm chứa các thông tin công khai của các đội bóng bao gồm: Lịch sử các trận đấu, Phong độ 5 trận gần nhất (Form: W-D-L), Điểm đánh giá Fair-play do các đối thủ cũ chấm điểm.
* Khi Đội A có nhu cầu tìm đối tác đá giao hữu, họ có thể tìm kiếm dữ liệu Đội B trên hệ thống để tham khảo uy tín, trình độ chuyên môn và phong độ thực tế trước khi gửi lời mời thi đấu trực tiếp qua nền tảng.



---

## IV. BẢN VẼ CƠ SỞ DỮ LIỆU THAM KHẢO (DATABASE SCHEMA FOR DEV)

Đội ngũ Developer/DBA sử dụng cấu trúc PostgreSQL dưới đây để thiết lập hệ thống bảng dữ liệu cốt lõi:

```sql
-- 1. Bảng Đội bóng (Tenant)
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(150) NOT NULL,
    current_fund_balance NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Người dùng hệ thống
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    zalo_user_id VARCHAR(100) UNIQUE, -- Khóa mapping cốt lõi với Zalo OA
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Trung gian Phân quyền Thành viên (Tenant Mapping)
CREATE TABLE team_members (
    team_id INT REFERENCES teams(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) CHECK (role IN ('owner', 'co_manager', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id)
);

-- 4. Bảng Chiến dịch thu tiền đột xuất (Ad-hoc Campaigns)
CREATE TABLE fund_campaigns (
    id SERIAL PRIMARY KEY,
    team_id INT REFERENCES teams(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount_per_person NUMERIC(15, 2) NOT NULL,
    deadline TIMESTAMP NOT NULL,
    is_merged_to_main_fund BOOLEAN DEFAULT TRUE, -- TRUE: Cộng gộp tổng quỹ, FALSE: Tách quỹ riêng
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng Danh sách đối tượng phải nộp tiền đột xuất
CREATE TABLE campaign_members (
    campaign_id INT REFERENCES fund_campaigns(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
    PRIMARY KEY (campaign_id, user_id)
);

-- 6. Bảng Quản lý Giao dịch Tài chính (Gộp Quỹ tháng và Khoản thu khác)
CREATE TABLE fund_transactions (
    id SERIAL PRIMARY KEY,
    team_id INT REFERENCES teams(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id), -- Đối tượng nộp tiền (Maker)
    campaign_id INT REFERENCES fund_campaigns(id) NULL, -- NULL nếu là quỹ tháng định kỳ, có ID nếu là khoản thu khác
    amount NUMERIC(15, 2) NOT NULL,
    evidence_image TEXT NOT NULL, -- Đường dẫn lưu trữ ảnh hóa đơn chuyển khoản
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by INT REFERENCES users(id), -- Người duyệt giao dịch (Checker)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

```

---

## V. YÊU CẦU PHI CHỨC NĂNG & HIỆU NĂNG HỆ THỐNG (NON-FUNCTIONAL SPECS)

* **Tốc độ xử lý (Latency):** Toàn bộ API nghiệp vụ lõi (Điểm danh, Tải màn hình phê duyệt) phải có thời gian phản hồi dưới **200ms**. Đặt chỉ mục (Index) hệ thống bắt buộc tại các trường tìm kiếm thường xuyên: `tenant_id`, `zalo_user_id`, `status`.
* **An toàn dữ liệu:** Các thao tác thay đổi số dư tài khoản trong bảng `teams` bắt buộc phải bọc trong các **Database Transactions** để đảm bảo tính toàn vẹn (ACID), tuyệt đối không xảy ra hiện tượng sai lệch số dư khi hai người quản lý cùng bấm duyệt bill một lúc.
* **Hàng đợi xử lý thông báo (Message Queue):** Các tác vụ quét gửi tin nhắc đóng tiền hay điểm danh hàng loạt qua Zalo OA phải được đẩy vào cấu trúc hàng đợi ngầm (**BullMQ hoặc RabbitMQ**). Hệ thống Backend tuyệt đối không gọi trực tiếp API Zalo tuần tự (Synchronous) trong luồng chính để tránh gây nghẽn và tràn bộ nhớ.