import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { hasPermissionPrefix } from '@/core/domain/permissions';
import { useAuthStore } from '@/features/auth/presentation/auth-store';
import { AttendanceScanScreen } from '@/features/training/presentation/AttendanceScanScreen';

/**
 * Quét QR: mã điểm danh (`?course=<mã>` chỉ điểm danh cho một khóa) hoặc mã chứng nhận (mở chi tiết chứng nhận nếu
 * người dùng được xem chứng nhận).
 */
export default function ScanRoute() {
  const { course } = useLocalSearchParams<{ course?: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const canReadCertificates = hasPermissionPrefix(user, 'training.certificate.read.');
  return (
    <AttendanceScanScreen
      courseCode={course}
      onCertificate={
        canReadCertificates
          ? (code) => router.push(`/res/certificates/${encodeURIComponent(code)}` as Href)
          : undefined
      }
    />
  );
}
