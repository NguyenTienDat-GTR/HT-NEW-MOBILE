# C-LEAD Mobile — Design System Master

> Nguồn: skill `ui-ux-pro-max` (`--design-system`, Flat Design, density 6, motion 3), **đã ghi đè màu/chữ/icon bằng token của web** theo yêu cầu "giao diện theo token FE".
> Nguồn sự thật của màu: `FE/src/styles/tokens.css`. Mã trong app: `src/shared/theme/tokens.ts`. Không viết mã màu trong component, chỉ dùng `useTheme()`.
> Khi làm một màn hình: nếu có `design-system/c-lead/pages/<tên>.md` thì file đó ghi đè file này.

## Phong cách
Flat Design: 2D, không đổ bóng nặng, đường nét sạch, chữ là trọng tâm, icon nét đều. Bo góc 8 (ô nhập, nút) và 12 (thẻ, panel). Bản sáng trước; kiến trúc theme đã chừa chỗ cho bản tối (`ThemeName`).

## Màu (chép từ tokens.css, light)
| Token | Giá trị | Dùng cho |
|---|---|---|
| background / canvas | `#f8fafc` | nền màn hình |
| card / surface1 | `#ffffff` | thẻ, panel, ô nhập |
| surface2 | `#f1f5f9` | nền phụ, chip, thanh nền biểu đồ |
| foreground | `#0f172a` | chữ chính |
| textSecondary | `#475569` | chữ phụ (tương phản 7.5:1 trên trắng) |
| muted | `#64748b` | chữ mờ, nhãn (4.8:1 trên trắng) |
| border / input | `#e2e8f0` / `#cbd5e1` | viền thẻ / viền ô nhập |
| primary / hover / soft | `#1e40af` / `#1e3a8a` / `#eff6ff` | nút chính, liên kết, nền nhấn |
| accent / ring | `#38bdf8` / `rgba(56,189,248,.45)` | điểm nhấn, vòng focus |
| success / warning / danger / info | `#047857` / `#b45309` / `#b91c1c` / `#2563eb` | trạng thái (chữ và icon) |
| badge nền | `#ecfdf5` `#fffbeb` `#fef2f2` | nền nhãn success / warning / danger |
| viz-1…8 | `#2a78d6 #eb6834 #1baf7a #eda100 #e87ba4 #008300 #6250d6 #e34948` | biểu đồ |

Quy tắc: chữ thường ≥ 4.5:1, icon/viền có nghĩa ≥ 3:1. Không dùng màu làm tín hiệu duy nhất (luôn kèm chữ hoặc icon). Đổi sang bản tối thì phải đo lại độ tương phản, không suy từ bản sáng.

## Chữ
Plus Jakarta Sans (có tiếng Việt), độ đậm 400/500/600/700, số dùng `fontVariant: ['tabular-nums']`.
| Vai trò | Cỡ / dòng / đậm |
|---|---|
| Tiêu đề màn hình | 24 / 32 / 700 |
| Tiêu đề khối | 18 / 24 / 600 |
| Nội dung | 16 / 24 / 400 (không dưới 16 cho ô nhập, tránh iOS tự phóng to) |
| Phụ | 14 / 20 |
| Nhãn nhỏ | 12 / 16 / 600 (tối thiểu cho chữ có nghĩa) |
| Số KPI | 22 / 28 / 700, tự co chữ |
Tôn trọng cỡ chữ hệ thống (Dynamic Type): không khóa chiều cao, cho phép xuống dòng, thử ở cỡ lớn nhất.

## Khoảng cách, bo góc
Nhịp 4/8: `2xs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32`. Lề ngang màn hình 16. Bo góc: input/button 8, panel 12, chip/badge tròn hẳn.

## Cảm ứng (quan trọng nhất)
- Vùng chạm tối thiểu **48×48dp** (iOS 44pt); icon nhỏ hơn thì nới `hitSlop`/đệm. Khoảng cách giữa hai vùng chạm ≥ 8.
- Ô nhập cao 48, nút chính cao 52, nút phụ/menu dòng cao 48. Nút chính rộng hết bề ngang, dính đáy trong vùng an toàn khi form dài.
- Phản hồi nhấn 80–150ms bằng đổi màu/độ mờ, **không** đổi kích thước (không nhảy bố cục). Trạng thái disabled rõ và không nhận chạm.
- Không có hover, không có thao tác chỉ bằng kéo/vuốt: luôn có nút thay thế.
- Mọi nút chỉ có icon phải có `accessibilityLabel` tiếng Việt; icon trang trí cạnh chữ ẩn khỏi trình đọc màn hình.

## Form
Nhãn luôn hiện phía trên (không dùng placeholder thay nhãn); lỗi ngay dưới ô, màu danger kèm icon, báo cho trình đọc màn hình (`accessibilityLiveRegion`); kiểm tra khi rời ô; sau khi gửi thất bại, cuộn tới ô lỗi đầu tiên. Bàn phím đúng loại (`email-address`, `number-pad`, `phone-pad`), phím "Tiếp" nhảy ô, `KeyboardAvoidingView` để ô và nút không bị bàn phím che. Hiện loading khi gửi, rồi thành công/lỗi. Form dài chia bước theo nhóm có thanh tiến độ. Mật khẩu cho phép dán và trình quản lý mật khẩu.

## Danh sách và dữ liệu
Không bảng cuộn ngang. Mỗi bản ghi là thẻ: tiêu đề, 1 dòng phụ, tối đa 2 trường mô tả, nhãn trạng thái; phần còn lại ở màn chi tiết. `FlatList` có `keyExtractor` ổn định, item `memo`. Bộ lọc trong sheet dưới. Skeleton khi tải, trạng thái rỗng có hướng dẫn hành động.

## Biểu đồ
Tính kích thước từ bề rộng thật của khung (`onLayout`), không dùng số px cố định của web. Có chú giải, giá trị chữ cho mọi thành phần (không dựa vào màu), cách xem dưới dạng bảng. Tối đa 6 lát donut (gộp "Khác"), nhãn trục thưa đủ cách nhau ≥ 40dp.

## Icon
`phosphor-react-native` (cùng họ icon với web). Cỡ 20/24, nét `bold`, mục đang chọn `fill`. Không dùng emoji làm icon. Không logo/hình raster làm icon thao tác.

## Điều hướng
Tab dưới tối đa 5 mục theo quyền; quay lại luôn đúng lịch sử; có deep link (bấm push mở đúng màn hình). Tôn trọng vùng an toàn (notch, thanh điều hướng) ở header, tab bar, thanh nút dưới.

## Chuyển động
150–300ms, mục đích rõ (phản hồi, chuyển ngữ cảnh), thoát nhanh hơn vào. Bật "giảm chuyển động" của hệ thống thì tắt hiệu ứng không cần thiết.

## Cấm
Emoji làm icon · mã màu viết thẳng trong component · placeholder thay nhãn · lỗi chỉ báo bằng màu · vùng chạm nhỏ hơn 44/48 · bảng cuộn ngang · chữ dưới 12 · khóa chiều cao làm cắt chữ khi cỡ chữ hệ thống lớn.

## Checklist trước khi giao (từ `references/pro-rules.md` của skill)
- [ ] Không emoji làm icon; icon cùng một họ, cùng độ dày nét
- [ ] Vùng chạm ≥ 44/48, cách nhau ≥ 8; icon nhỏ có `hitSlop`
- [ ] Có phản hồi nhấn, trạng thái disabled rõ
- [ ] Chữ ≥ 4.5:1; viền/icon có nghĩa ≥ 3:1
- [ ] Màu qua token, không hex trong component
- [ ] Vùng an toàn đúng; nội dung không bị thanh cố định che
- [ ] Đã thử 320px, 375px, 430px, ngang, cỡ chữ hệ thống lớn nhất, giảm chuyển động
- [ ] Nhãn/hint/lỗi cho mọi ô nhập; icon nút có tên; thứ tự đọc đúng thứ tự nhìn
