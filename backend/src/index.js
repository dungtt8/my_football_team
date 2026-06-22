const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(express.json());

// Cấu hình CORS nghiêm ngặt: Chỉ cho phép domain Frontend và Localhost kết nối
const allowedOrigins = ['https://myteam.revonexus.net', 'http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Chặn bởi cấu hình CORS của Hệ thống!'));
    }
  },
  credentials: true
}));

// API Kiểm tra trạng thái hệ thống
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'API Core của Nền tảng SaaS đang chạy mượt mà dưới dạng Serverless!' 
  });
});

// Zalo Webhook Endpoint (Sẽ dùng cho việc bắt sự kiện đồng bộ User)
app.post('/api/webhook/zalo', (req, res) => {
  console.log('Nhận dữ liệu từ Zalo:', req.body);
  res.status(200).send('OK');
});

module.exports = app;