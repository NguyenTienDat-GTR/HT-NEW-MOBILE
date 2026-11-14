import { useRouter, type Href } from 'expo-router';

import { hasPermissionPrefix } from '@/core/domain/permissions';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { AttendanceScanScreen } from '@/features/training/presentation/AttendanceScanScreen';

/**
 * Tab giữa thanh tab: trình quét QR chung như nút quét ở header web. Mã điểm danh được tra cứu rồi chờ xác nhận;
 * mã chứng nhận mở chi tiết chứng nhận (nếu người dùng được xem chứng nhận).
 */
export default function ScanTab() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const canReadCertificates = hasPermissionPrefix(user, 'training.certificate.read.');
  return (
    <AttendanceScanScreen
      showTitle
      onCertificate={
        canReadCertificates
          ? (code) => router.push(`/res/certificates/${encodeURIComponent(code)}` as Href)
          : undefined
      }
    />
  );
}
