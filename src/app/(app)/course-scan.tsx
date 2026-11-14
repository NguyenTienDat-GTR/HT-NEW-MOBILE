import { useLocalSearchParams } from 'expo-router';

import { AttendanceScanScreen } from '@/features/training/presentation/AttendanceScanScreen';

/** Điểm danh bằng mã QR cho một khóa (`?course=<mã>`), mở từ màn điểm danh của khóa. */
export default function CourseScanRoute() {
  const { course } = useLocalSearchParams<{ course?: string }>();
  return <AttendanceScanScreen courseCode={course} />;
}
