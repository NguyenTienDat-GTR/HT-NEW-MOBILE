# C-LEAD Mobile

Ứng dụng di động (Android + iOS) của hệ thống quản lý huynh trưởng C-LEAD, viết bằng React Native (Expo).

```bash
npm install
cp .env.example .env.local   # chỉnh địa chỉ API nếu cần
npm start
```

- Quy ước, kiến trúc và lệnh: xem [CLAUDE.md](CLAUDE.md).
- Thiết kế giao diện: [design-system/c-lead/MASTER.md](design-system/c-lead/MASTER.md).
- Build thử bằng EAS: `npx eas-cli@latest build --profile development --platform android` (cần tài khoản Expo; push iOS cần Apple Developer).
