import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatDate } from '@/core/domain/date-format';
import { fmtNumber } from '@/core/domain/number-format';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Text } from '@/shared/ui/Text';

import type { OpenCourse } from '../../domain/entities';
import { deadlineText } from '../../domain/labels';

const COLLAPSED_COUNT = 3;

/**
 * Khóa đang mở đăng ký: khóa sắp hết hạn có nhãn "Sắp đóng" (chữ, không chỉ màu). Hiện 3 khóa đầu,
 * còn lại sau "Xem thêm" để màn hình không dài.
 */
export function OpenCoursesList({
  courses,
  loading,
}: {
  courses?: readonly OpenCourse[];
  loading?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (loading || !courses) return <LoadingState />;
  if (courses.length === 0) {
    return (
      <View accessible accessibilityLabel="Hiện chưa có khóa nào đang mở đăng ký">
        <Text variant="bodyStrong">Hiện chưa có khóa nào đang mở đăng ký</Text>
        <Text variant="secondary" tone="muted">
          Khóa mới mở đăng ký sẽ xuất hiện ở đây.
        </Text>
      </View>
    );
  }
  const shown = expanded ? courses : courses.slice(0, COLLAPSED_COUNT);
  return (
    <View style={styles.list}>
      {shown.map((course) => (
        <Card key={course.courseCode}>
          <View style={styles.card}>
            <View style={styles.top}>
              <Text variant="bodyStrong" style={styles.name} numberOfLines={2}>
                {course.courseName}
              </Text>
              {course.urgency === 'closing' ? <Badge label="Sắp đóng" tone="warning" /> : null}
            </View>
            <Text variant="secondary" tone="textSecondary">
              {[course.courseType, course.location].filter(Boolean).join(' · ')}
            </Text>
            <Text variant="secondary" tone="muted">
              {formatDate(course.startDate)} – {formatDate(course.endDate)}
            </Text>
            <Text variant="label" tone={course.urgency === 'closing' ? 'warning' : 'textSecondary'}>
              {deadlineText(course.hoursLeft)} · {fmtNumber(course.registeredLeaders)} huynh trưởng
              đã đăng ký
            </Text>
          </View>
        </Card>
      ))}
      {courses.length > COLLAPSED_COUNT ? (
        <Button
          label={expanded ? 'Thu gọn' : `Xem thêm ${courses.length - COLLAPSED_COUNT} khóa`}
          variant="ghost"
          size="sm"
          onPress={() => setExpanded((value) => !value)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  card: { gap: 2 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { flex: 1 },
});
