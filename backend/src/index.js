require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;

// For now, skip database connection test (will test on deploy)
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

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