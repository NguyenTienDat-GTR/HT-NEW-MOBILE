# C-LEAD Mobile

Ứng dụng di động (Android + iOS) của hệ thống quản lý huynh trưởng C-LEAD, viết bằng React Native (Expo SDK 58, TypeScript, Expo Router). Dùng chung backend (`HT-NEW`) và quy tắc nghiệp vụ với web (`HT-NEW-FE`).

## Có gì trong app

Mọi màn hình hiện theo quyền của tài khoản (cùng mã quyền `module.resource.action.scope` với web). Danh sách là thẻ, chi tiết xem khi chạm vào thẻ; chỉ có giao diện sáng.

| Nhóm                                 | Nội dung                                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Đăng nhập, tài khoản của tôi         | Đăng nhập (Turnstile), quên/đổi mật khẩu, đồng ý chính sách, hồ sơ cá nhân, quyền của tôi                        |
| Thông báo                            | Hộp thư, thông báo thời gian thực, push (Expo Push Service), đếm chưa đọc                                        |
| Tổng quan, Phân tích                 | Biểu đồ tự vẽ theo bề rộng màn hình, 3 biến thể theo phạm vi, các tab phân tích                                  |
| Tổ chức, Huynh trưởng, Ban điều hành | Giáo phận/hạt/xứ, hồ sơ huynh trưởng, cấp độ, chức vụ, phân công                                                 |
| Huấn luyện                           | Loại khóa, khóa, đăng ký, duyệt, tham dự, chấm điểm, chia đội, điểm danh + quét QR, email mời, gửi liên giáo hạt |
| Chứng nhận                           | Danh sách, duyệt/từ chối (một và hàng loạt), thu hồi, cấp lại, chia sẻ PDF, quét QR chứng nhận                   |
| Hệ thống                             | Tài khoản, vai trò, quyền hạn, gán vai trò, phân quyền vai trò và tài khoản, nhật ký                             |

**Không làm trên mobile (để web):** thiết kế cấu hình chứng nhận/thẻ, nhập/xuất Excel, ma trận phân quyền, thu hồi nhiều quyền một lần, sửa/bật tắt quyền hạn, tạo chứng nhận ngoại lệ, khóa quá khứ.

## Trạng thái

- **Chưa đăng nhập được vào production**: app dùng `/api/mobile/auth/{login,refresh,logout}` (token trong thân JSON, không cookie) và `/api/mobile/push/devices`, hai nhóm endpoint này **chưa có ở BE**. Chờ hai PR BE chỉ thêm mới, không đổi API web (`feat/mobile-auth`, `feat/mobile-push`). Từ đó đến khi merge, app chỉ chạy được với BE giả.
- Mọi kiểm tra đến nay là lint, typecheck, test đơn vị và xem thử bản web Expo với API giả (320–430px). **Chưa thử trên máy thật**, chưa thử camera quét QR, chia sẻ PDF, push và Turnstile.
- Các endpoint nghiệp vụ còn lại là endpoint web đang dùng, gọi kèm Bearer.

## Chạy thử

```bash
npm install
cp .env.example .env.local   # điền địa chỉ máy chủ (bắt buộc, xem bên dưới)
npm start                    # Expo dev server
```

**Cấu hình địa chỉ máy chủ.** Địa chỉ thật không nằm trong repo và app không có địa chỉ mặc định: thiếu biến nào thì app báo lỗi rõ tên biến ngay khi mở. Ba biến trong `.env.example`: `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_WS_URL`, `EXPO_PUBLIC_SITE_ORIGIN`. Chúng bị nhúng vào app nên **không đặt bí mật**. Expo tự đọc `.env.local` khi chạy `npm start`; các tệp `.env*.local` và `.env*.prod` đã được bỏ qua khỏi git. Từ SDK 58, Expo chỉ tự đọc `.env`, `.env.local`, `.env.development` và `.env.production` (kèm bản `.local`), không đọc tệp tên khác như `.env.prod`; muốn dùng giá trị production khi chạy local, chép nội dung sang `.env.local` hoặc `.env.production.local`.

Expo Go chỉ có các module gốc được đóng gói. App dùng thêm `expo-camera`, `expo-notifications`, `expo-secure-store`… nên cần **development build**:

```bash
npx eas-cli@latest build --profile development --platform android
```

Xem thử giao diện trên trình duyệt: `npx expo start --web` (chỉ để xem; Turnstile và lưu token an toàn chỉ có trên máy thật). Muốn xem với dữ liệu giả, đặt `EXPO_PUBLIC_API_BASE_URL` trỏ tới một máy chủ giả cùng hợp đồng `{ success, message, data }`.

## Lệnh

```bash
npm run lint         # ESLint, gồm kiểm tra ranh giới kiến trúc
npm run typecheck
npm test
npx expo-doctor
```

CI (`.github/workflows/ci.yml`) chạy lint, typecheck và test cho mỗi PR vào `main`.

## Kiến trúc và quy ước

Xem [CLAUDE.md](CLAUDE.md) (Clean Architecture theo tính năng, màn CRUD chạy theo cấu hình `ResourceDefinition`, quy tắc nhánh/PR) và [design-system/c-lead/MASTER.md](design-system/c-lead/MASTER.md) (màu, chữ, vùng chạm, checklist giao diện).

## Phát hành (việc cần tài khoản của chủ dự án)

Các bước dưới đây tôi không làm thay được vì cần đăng nhập và thông tin riêng:

1. **Expo/EAS**: `npx eas-cli@latest login`, rồi `npx eas-cli@latest init` để gắn dự án (ghi `extra.eas.projectId` vào `app.json`, commit lại).
2. **Push Android**: tạo dự án Firebase (miễn phí), tải `google-services.json`, nạp khóa FCM V1 vào EAS (`eas credentials`). Tệp `google-services.json` không commit vào repo: trên EAS đưa qua biến tệp `GOOGLE_SERVICES_JSON` (`eas env:create --type file`), `app.config.js` tự gắn vào `android.googleServicesFile`; ở máy local đặt tệp ở thư mục gốc.
3. **Push iOS và build iOS**: cần Apple Developer (99 USD/năm).
4. **Biểu tượng thông báo Android**: nên thêm biểu tượng đơn sắc nền trong suốt (cấu hình `icon` của plugin `expo-notifications`); hiện dùng biểu tượng app.
5. **Google Play**: tạo ứng dụng trên Play Console trước khi `eas submit`; hồ sơ nộp đang đặt đường `internal`.
6. **Định danh app** `vn.io.clead.app` (Android package và iOS bundle id): đổi được trước lần build đầu, sau khi lên cửa hàng thì không.

Build thử nội bộ (APK): `npx eas-cli@latest build --profile preview --platform android`. **Biến `EXPO_PUBLIC_*` của bản build EAS đặt trong biến môi trường của EAS** (expo.dev hoặc `eas env:create`), không ghi vào `eas.json` hay repo; build thiếu biến thì app báo lỗi khi mở, nên phải đặt đủ ba biến cho từng môi trường trước khi build.

## Bảo mật

- Token chỉ lưu bằng `expo-secure-store` (Keychain/Keystore), không dùng AsyncStorage; đăng xuất xóa token và hủy đăng ký thiết bị nhận push.
- Không đưa bí mật vào repo (`.env*.local`, `google-services.json`, khóa ký). Địa chỉ trong `EXPO_PUBLIC_*` bị nhúng vào app (không phải bí mật) nhưng vẫn không ghi vào repo.
