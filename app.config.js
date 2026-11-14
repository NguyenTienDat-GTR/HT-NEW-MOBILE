const fs = require('fs');

/**
 * Bọc app.json: chỉ thêm `android.googleServicesFile` (cấu hình Firebase cho push Android) khi có tệp.
 * Tệp google-services.json không nằm trong repo: trên EAS truyền qua biến tệp GOOGLE_SERVICES_JSON,
 * ở máy local đặt tệp ở thư mục gốc. Không có thì bỏ qua để `expo start` vẫn chạy.
 */
module.exports = ({ config }) => {
  const file =
    process.env.GOOGLE_SERVICES_JSON ||
    (fs.existsSync('./google-services.json') ? './google-services.json' : undefined);
  if (!file) return config;
  return { ...config, android: { ...config.android, googleServicesFile: file } };
};
