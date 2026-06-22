Chào bạn, dưới đây là tài liệu **Thiết kế Hệ thống Tổng thể (High-Level Design - HLD)** và **Thiết kế Hệ thống Chi tiết (Low-Level Design - LLD)** cho nền tảng SaaS Quản lý Đội bóng Phong trào. Tài liệu này được chuẩn hóa dựa trên kiến trúc Monorepo Serverless (Vercel + Express + Supabase + Inngest) đã thống nhất để đội ngũ phần mềm bắt tay vào lập trình.

---

# TÀI LIỆU THIẾT KẾ KIẾN TRÚC HỆ THỐNG (HLD & LLD)

## PHẦN 1: HIGH-LEVEL DESIGN (HLD) - THIẾT KẾ TỔNG THỂ

### 1.1. Sơ đồ Khối và Luồng Tương tác Hệ thống (System Topology)

Hệ thống vận hành theo mô hình decoupled (tách biệt) thông qua giao tiếp HTTPS/REST API và Event-Driven (Hướng sự kiện) để xử lý ngầm.

```
[ PWA Client ] (myteam.revonexus.net)
      │
   (HTTPS + JWT)
      ▼
[ Vercel Serverless API ] (api.myteam.revonexus.net)
      │
      ├─► [ Supabase PostgreSQL ] (Shared DB, Isolated by team_id)
      │
      └─► [ Inngest Event Bus ] (Quản lý Hàng đợi & Cron Job)
               │
               └─► (Gọi ngược về API) ─► [ Zalo OA API / VietQR Engine ]

```

### 1.2. Kiến trúc Đa Thuê bao (SaaS Multi-tenancy)

* **Chiến lược:** Shared Database, Shared Schema. Dữ liệu của tất cả các đội bóng nằm chung trong các bảng.
* **Cơ chế cô lập (Isolation):** Mọi bảng dữ liệu liên quan đến nghiệp vụ (Giao dịch, Điểm danh, Chỉ số) bắt buộc phải có cột `team_id`.
* **Bảo mật tầng ứng dụng:** Middleware của Backend sẽ giải mã JWT để lấy `team_id` của Session hiện tại và tự động chèn điều kiện `WHERE team_id = X` vào tất cả các câu lệnh truy vấn SQL.

### 1.3. Mô hình Xác thực & Phân quyền (Authentication & RBAC)

* **Xác thực:** Người dùng đăng nhập qua Zalo Login $\rightarrow$ Backend cấp 1 mã `AccessToken` dạng JWT có thời hạn.
* **Cấu trúc JWT Payload:**
```json
{
  "user_id": 123,
  "team_id": 456,
  "role": "co_manager",
  "exp": 1719043200
}

```


* **Phân quyền (RBAC Middleware):** Các API dạng tác vụ (ví dụ: Phê duyệt quỹ, Chốt điểm danh) sẽ đi qua một Middleware kiểm tra thuộc tính `role` trong JWT. Nếu `role` không thuộc danh sách cho phép (`owner`, `co_manager`), hệ thống lập tức trả về lỗi `403 Forbidden`.

---

## PHẦN 2: LOW-LEVEL DESIGN (LLD) - THIẾT KẾ CHI TIẾT

Phần này đi sâu vào đặc tả chi tiết mã nguồn, thiết kế API và thuật toán cho 2 module cốt lõi của URS.

### 2.1. Module Tài chính & Phê duyệt 2 Cấp (Maker/Checker)

#### A. Thiết kế API Endpoints

| Method | Endpoint | Quyền (RBAC) | Mô tả |
| --- | --- | --- | --- |
| `POST` | `/api/v1/finance/campaign` | Owner, Co-Manager | Tạo chiến dịch thu tiền đột xuất |
| `POST` | `/api/v1/finance/transaction/submit` | All (Maker) | Thành viên tải ảnh bill chuyển khoản (Pending) |
| `PATCH` | `/api/v1/finance/transaction/:id/approve` | Owner, Co-Manager | Phê duyệt giao dịch, cộng tiền vào tổng quỹ |

#### B. Xử lý Chống nghẽn & Đua dữ liệu (Race Condition) khi Phê duyệt Quỹ

Khi 2 Quản lý cùng bấm nút "Duyệt" một hóa đơn cùng một lúc, hệ thống có thể bị tính toán sai số dư quỹ (Double Spending/Cộng gộp sai).

**Mã xử lý chi tiết (Node.js/Express + Knex/Raw Postgres):**

```javascript
const express = require('express');
const router = express.Router();
const supabasePool = require('../db'); // Kết nối qua Pooler cổng 6543

router.patch('/finance/transaction/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { team_id, user_id } = req.user; // Lấy từ JWT Middleware

  // Khởi tạo một Database Transaction để đảm bảo tính ACID
  const client = await supabasePool.connect();
  
  try {
    await client.query('BEGIN');

    // Bước 1: Khóa dòng dữ liệu giao dịch và kiểm tra trạng thái (Tránh duyệt trùng)
    const txCheck = await client.query(
      'SELECT status, amount, campaign_id FROM fund_transactions WHERE id = $1 AND team_id = $2 FOR UPDATE',
      [id, team_id]
    );
    
    if (txCheck.rows.length === 0 || txCheck.rows[0].status !== 'pending') {
      throw new Error('Giao dịch không tồn tại hoặc đã được xử lý trước đó.');
    }
    
    const { amount, campaign_id } = txCheck.rows[0];

    // Bước 2: Cập nhật trạng thái giao dịch sang Approved
    await client.query(
      'UPDATE fund_transactions SET status = $1, approved_by = $2 WHERE id = $3',
      ['approved', user_id, id]
    );

    // Bước 3: Kiểm tra cấu hình có cộng gộp vào quỹ tổng hay không (Nếu là khoản thu đột xuất)
    let shouldMerge = true;
    if (campaign_id) {
      const campaignCheck = await client.query(
        'SELECT is_merged_to_main_fund FROM fund_campaigns WHERE id = $1',
        [campaign_id]
      );
      shouldMerge = campaignCheck.rows[0].is_merged_to_main_fund;
    }

    // Bước 4: Nếu cho phép cộng gộp, thực hiện Khóa bi quan (Pessimistic Lock) bảng teams để cập nhật số dư
    if (shouldMerge) {
      await client.query('SELECT current_fund_balance FROM teams WHERE id = $1 FOR UPDATE', [team_id]);
      await client.query(
        'UPDATE teams SET current_fund_balance = current_fund_balance + $1 WHERE id = $2',
        [amount, team_id]
      );
    }

    // Cam kết các thay đổi vào DB hoàn tất
    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: 'Phê duyệt giao dịch thành công.' });

  } catch (error) {
    await client.query('ROLLBACK'); // Hủy bỏ toàn bộ nếu có lỗi, an toàn dữ liệu 100%
    return res.status(400).json({ success: false, error: error.message });
  } finally {
    client.release(); // Trả kết nối lại cho Pool để tiết kiệm tài nguyên Supabase Free
  }
});

```

---

### 2.2. Engine Điểm Danh & Thuật Toán Vinh Danh (Leaderboard)

#### A. Công thức Logic tính toán Tốc độ Phản hồi ($\Delta t$)

Để vinh danh thành viên phản hồi sớm nhất tháng theo URS, tại bảng `attendance` ta lưu trữ hai trường thời gian kiểu `TIMESTAMP`:

* `notified_at`: Thời điểm hệ thống gửi tin Zalo OA.
* `responded_at`: Thời điểm thành viên bấm nút Có/Không trên PWA.

Công thức tính khoảng thời gian chênh lệch:


$$\Delta t = \text{responded\_at} - \text{notified\_at}$$

#### B. Mã giải thuật (Pseudocode) Tính toán Bảng xếp hạng Cuối tháng

Hệ thống chạy ngầm qua Inngest Cron Job vào lúc **23:59 ngày cuối cùng của tháng** để quét và ghi nhận kết quả.

```javascript
async function calculateMonthlyLeaderboard(team_id, target_month, target_year) {
  // Thực hiện truy vấn tổng hợp hiệu năng chuyên cần và tốc độ từ Database
  const query = `
    SELECT 
      a.user_id,
      u.full_name,
      COUNT(CASE WHEN a.status = 'present' THEN 1 END) as total_match_attended,
      SUM(EXTRACT(EPOCH FROM (a.responded_at - a.notified_at))) as total_delta_seconds
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    WHERE a.team_id = $1 
      AND EXTRACT(MONTH FROM a.match_date) = $2
      AND EXTRACT(YEAR FROM a.match_date) = $3
      AND a.responded_at IS NOT NULL
    GROUP BY a.user_id, u.full_name
    ORDER BY 
      total_match_attended DESC, -- Ưu tiên 1: Đi đủ trận/Chuyên cần cao nhất
      total_delta_seconds ASC    -- Ưu tiên 2: Tổng thời gian phản hồi delta_t nhỏ nhất (Nhanh nhất)
    LIMIT 5; -- Lấy ra Top 5 người xuất sắc nhất tháng để vinh danh
  `;
  
  const result = await db.query(query, [team_id, target_month, target_year]);
  
  // Lưu kết quả bảng xếp hạng này vào Redis Cache hoặc bảng 'leaderboards' để FE tải tức thì < 200ms
  await redis.set(`leaderboard:${team_id}:${target_year}-${target_month}`, JSON.stringify(result.rows));
}

```

---

### 2.3. Thiết kế Quản lý Hàng đợi (Queue) bằng Inngest (Serverless-friendly)

Để gửi tin nhắn Zalo nhắc nợ hàng loạt cho 30-40 thành viên mà không gây timeout cho serverless của Vercel, chúng ta định nghĩa một luồng xử lý bất đồng bộ bằng Inngest:

```javascript
import { Inngest } from "inngest";
const inngest = new Inngest({ id: "football-saas" });

export const sendBulkZaloReminders = inngest.createFunction(
  { id: "send-bulk-zalo-reminders" },
  { event: "finance/campaign.created" }, // Lắng nghe sự kiện tạo chiến dịch
  async ({ event, step }) => {
    const { unpaid_members, campaign_title, amount } = event.data;

    // Chia nhỏ danh sách gửi, xử lý tuần tự (Debounce/Throttle) để không bị khóa API Zalo
    for (const member of unpaid_members) {
      await step.run(`Send Zalo to user: ${member.id}`, async () => {
        // Gọi API Zalo OA ở đây
        await fetch('https://openapi.zalo.me/v2.0/oa/message', {
          method: 'POST',
          headers: { 'access_token': process.env.ZALO_OA_TOKEN },
          body: JSON.stringify({
            recipient: { user_id: member.zalo_user_id },
            message: { text: `[Nhắc nợ] Bạn có khoản nộp: ${campaign_title} số tiền ${amount}đ. Vui lòng thanh toán!` }
          })
        });
      });
    }
  }
);

```
