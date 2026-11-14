# C-LEAD Mobile

App React Native (Expo SDK 58, TypeScript strict, Expo Router) cho Android và iOS, dùng chung backend với web (`BE`, `FE` ở thư mục anh em). Repo GitHub: `NguyenTienDat-GTR/HT-NEW-MOBILE`.

## Quy tắc

- Nhánh từ `main`, mở PR vào `main`; chỉ chủ repo merge, Claude mở PR rồi dừng. Mỗi đợt một PR.
- Mọi thông báo cho người dùng viết tiếng Việt; lưu file UTF-8.
- Không đưa bí mật vào repo (`.env*.local`, `google-services.json`, khóa ký). Biến `EXPO_PUBLIC_*` bị nhúng vào app nên không chứa bí mật.
- Trước khi viết code dùng API Expo/React Native: đọc phiên bản `expo` trong `package.json`, tra tài liệu đúng phiên bản (`https://docs.expo.dev/llms.txt`). Cài thư viện bằng `npx expo install`.
- `ios/` và `android/` được sinh tự động (CNG), không sửa tay; cấu hình native ở `app.json` và config plugin.
- Thay đổi hành vi người dùng nhìn thấy thì cập nhật trang hướng dẫn ở `huong-dan-deploy`.

## Kiến trúc (Clean Architecture, ép bằng ESLint `boundaries`)

```
src/core         lỗi, mạng (HttpClient + decorator Bearer), phiên (single-flight refresh), lưu trữ, cấu hình
src/shared       theme (token chép từ FE/src/styles/tokens.css), UI kit dùng chung
src/features/<tên>/{domain,data,presentation}
src/composition  composition root: nơi DUY NHẤT nối data với presentation
src/app          route Expo Router, chỉ là lớp mỏng gọi màn hình của tính năng
```

- `domain` thuần TypeScript (không React/Expo/fetch), chỉ phụ thuộc `core` và domain cùng tính năng.
- `data` cài đặt các interface của domain; DTO của BE không lọt lên trên (qua mapper).
- `presentation` chỉ nhận use case qua Provider của tính năng (không service locator toàn cục).
- Tính năng không import `data`/`presentation` của tính năng khác. Thêm tính năng = thêm thư mục + Provider trong `composition`.
- Mỗi use case một việc (SRP); thêm màn danh sách mới bằng cấu hình, không sửa màn chung (OCP).

## Màn danh sách / chi tiết / form theo cấu hình

Các màn CRUD (tổ chức, huynh trưởng, ban điều hành…) chạy bằng `ResourceDefinition` (`src/shared/resource/types.ts`): thêm màn = viết một định nghĩa trong `features/<tên>/presentation`, đăng ký ở `src/composition/resource-registry.ts` và thêm một dòng ở `src/composition/menu-entries.ts`; các màn chung (`ResourceListScreen`, `ResourceDetailScreen`, `ResourceFormScreen`) không phải sửa. Màn cần giao diện riêng dùng `renderList` / `renderDetail` / `renderForm`; ô nhập riêng của tính năng dùng `kind: 'custom'` với `render`. Quy tắc quyền hiển thị nút nằm ở `domain/*-permissions.ts`, theo đúng web.

Vùng an toàn: `Screen`, danh sách và nút dính đáy lấy khoảng chừa từ `useScreenInsets()` (`shared/ui/screen-insets.tsx`), không gọi `useSafeAreaInsets` trực tiếp. Stack đã chừa phía trên (thanh tiêu đề), thanh tab đã chừa phía dưới; phần còn lại màn tự chừa để nút home / thanh điều hướng của Android không che nút hay chặn cuộn. Danh sách dài cuộn vô hạn: `FlatList.onEndReached`, hoặc `Screen`/`BottomSheet` với `onEndReached` + `loadingMore` (hook `useEndReached`); không dùng nút "Tải thêm".

Bố cục gọn: form xếp cặp hai cột các ô ngắn liền kề (ô ngày, ô số; hoặc `width: 'half'`), ô ngắn lẻ chỉ nửa chiều rộng (`groupFormRows` ở `form-logic.ts`); màn chi tiết bọc các `InfoRow` trong `InfoGrid` để giá trị ngắn xếp hai cột. Ngày luôn chọn bằng `DateField` (lịch hệ điều hành, không gõ tay). Mũi tên quay lại là `HeaderBackButton` tự vẽ để không trùng màu nền thanh tiêu đề.

Form tạo/sửa chia thành các phần gập được (`FormSection`); khi lưu bị lỗi, các phần có lỗi tự mở, màn cuộn tới ô lỗi đầu tiên và focus vào đó (`firstFormError`). Gợi ý của ô (`hint`) hiện sau dấu "?" cạnh nhãn (`FieldLabel`), không in dưới ô. Ngày hiển thị dd/MM/yyyy; ô `datetime` (vd. thời gian đăng ký) chọn ngày rồi giờ, giá trị `yyyy-MM-ddTHH:mm` giờ Việt Nam.

Thanh tab dưới (`src/app/(app)/(tabs)/_layout.tsx`): Tổng quan, Khóa huấn luyện, **Quét QR** (tab thường như các tab khác), Thông báo, Menu. Tab Khóa huấn luyện và Quét QR ẩn theo quyền (`canSeeMenuEntry`, `canUseQrScanner`). Trình quét chung `AttendanceScanScreen` giống nút quét ở header web (mã điểm danh, mã chứng nhận, nhập/dán mã, chọn ảnh); camera chỉ bật khi màn đang được xem. Điểm danh riêng một khóa mở ở `/course-scan?course=<mã>`.

Thao tác riêng trên một bản ghi (duyệt, thu hồi, chia sẻ PDF…) đặt ở `renderDetailExtra` để dùng lại màn chi tiết chung. Tải nội dung nhị phân (PDF) dùng `gateway.download` (có Bearer và tự làm mới phiên), rồi `shared/files/share-file.ts` ghi vào bộ nhớ đệm và mở hộp chia sẻ của hệ điều hành.

## Giao diện

Theo skill `ui-ux-pro-max`; design system ở `design-system/c-lead/MASTER.md` (đã ghi đè màu/chữ bằng token FE). Chỉ dùng `useTheme()`, không viết mã màu trong component. Vùng chạm ≥ 48dp, ô nhập cao 48, nút chính cao 52, không bảng cuộn ngang (danh sách là thẻ, trường phụ ở màn chi tiết), biểu đồ tính kích thước từ bề rộng thật. Hiện chỉ có bản sáng vì FE chưa có dark mode.

## Lệnh

```bash
npm start            # Expo dev server
npm run lint         # ESLint (gồm kiểm tra kiến trúc)
npm run typecheck
npm test
npx expo-doctor
```

Xem thử giao diện trên trình duyệt: `npx expo start --web` (chỉ để xem; Turnstile và lưu token an toàn chỉ có trên máy thật).

## Hợp đồng API với BE

- App gọi đúng các endpoint web đang dùng (`/api/...`, Bearer) qua địa chỉ đặt trong `EXPO_PUBLIC_API_BASE_URL` (không ghi địa chỉ thật trong repo; xem `.env.example`).
- Riêng đăng nhập/làm mới/đăng xuất dùng `/api/mobile/auth/{login,refresh,logout}` (token trong thân JSON, không cookie). Hợp đồng và PR BE: xem kế hoạch; chưa có trên production cho tới khi PR BE được merge.
- Push: đăng ký thiết bị `/api/mobile/push/devices`, nhận qua Expo Push Service; cũng chưa có ở BE (PR `feat/mobile-push`).
- Danh sách endpoint theo từng nhóm màn hình: xem `features/*/presentation/*-resource.ts(x)` và các màn riêng; quy tắc quyền/hiện nút ở `features/*/domain/*-permissions.ts`.

## Phát hành

Cấu hình EAS ở `eas.json` (profile development/preview/production); biến `EXPO_PUBLIC_*` của từng môi trường đặt ở biến môi trường của EAS, không ghi vào `eas.json`. Các bước cần tài khoản của chủ dự án (EAS init, Firebase, Apple, Play Console) ghi ở `README.md`. Trang hướng dẫn người dùng ở `huong-dan-deploy` chỉ cập nhật khi app được phát hành.
