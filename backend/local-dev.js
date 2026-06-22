const app = require('./src/index.js');

// Định nghĩa Port chạy dưới máy local
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 [BACKEND] API đang chạy tại: http://localhost:${PORT}`);
  console.log(`🏥 Kiểm tra Health Check: http://localhost:${PORT}/api/health`);
  console.log(`===================================================`);
});