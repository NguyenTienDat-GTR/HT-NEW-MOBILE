import { useLocalSearchParams } from 'expo-router';

import { AttendanceScanScreen } from '@/features/training/presentation/AttendanceScanScreen';

/** Quét QR điểm danh; `?course=<mã>` chỉ điểm danh cho một khóa. */
export default function ScanRoute() {
  const { course } = useLocalSearchParams<{ course?: string }>();
  return <AttendanceScanScreen courseCode={course} />;
}
