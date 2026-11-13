import { CameraView, useCameraPermissions } from 'expo-camera';
import { useReducer, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { formatDateTime } from '@/core/domain/date-format';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { useTheme } from '@/shared/theme/theme-provider';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InfoRow } from '@/shared/ui/InfoRow';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import {
  classifyScan,
  INITIAL_SCAN_FLOW,
  LEGACY_ATTENDANCE_MESSAGE,
  scanFlowReducer,
  shouldProcessScan,
  UNKNOWN_SCAN_MESSAGE,
  type ScanGate,
  type ScanPerson,
} from '../domain/attendance-scan';

export interface AttendanceScanScreenProps {
  /** Có mã khóa = chỉ điểm danh cho khóa đó; không có = khóa nằm trong chính mã QR. */
  courseCode?: string;
}

const path = (courseCode: string | undefined, action: 'scan' | 'lookup') =>
  courseCode
    ? `/training/courses/${encodeURIComponent(courseCode)}/attendance/${action}`
    : `/training/attendance/${action}`;

/**
 * Quét mã QR điểm danh: camera đọc mã → tra cứu người → xác nhận → điểm danh → quét tiếp.
 * Có ô nhập mã thủ công (máy không có camera, hoặc để thử trên web).
 */
export function AttendanceScanScreen({ courseCode }: AttendanceScanScreenProps) {
  const gateway = useResourceGateway();
  const { colors, radius } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, dispatch] = useReducer(scanFlowReducer, INITIAL_SCAN_FLOW);
  const gate = useRef<ScanGate>(null);
  const [manual, setManual] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const handleRaw = async (raw: string) => {
    const payload = classifyScan(raw);
    if (payload.kind === 'attendance') {
      setNote(null);
      dispatch({ type: 'scanned', token: payload.token });
      try {
        const person = await gateway.call<ScanPerson>('POST', path(courseCode, 'lookup'), {
          body: { token: payload.token },
        });
        dispatch({ type: 'looked-up', person });
      } catch (exception) {
        dispatch({ type: 'failed', message: errorMessage(exception) });
      }
      return;
    }
    setNote(
      payload.kind === 'legacy-attendance'
        ? LEGACY_ATTENDANCE_MESSAGE
        : payload.kind === 'certificate'
          ? 'Đây là mã QR của chứng nhận, không phải mã điểm danh. Hãy quét mã trên thẻ tham dự.'
          : UNKNOWN_SCAN_MESSAGE,
    );
  };

  const onBarcode = ({ data }: { data: string }) => {
    const now = Date.now();
    if (state.step !== 'scanning' || !shouldProcessScan(data, now, gate.current)) return;
    gate.current = { token: data, at: now };
    void handleRaw(data);
  };

  const confirm = async () => {
    if (state.step !== 'confirm') return;
    dispatch({ type: 'confirm' });
    try {
      const person = await gateway.call<ScanPerson>('POST', path(courseCode, 'scan'), {
        body: { token: state.token },
      });
      dispatch({ type: 'confirmed', person });
    } catch (exception) {
      dispatch({ type: 'failed', message: errorMessage(exception) });
    }
  };

  const next = () => {
    gate.current = null;
    dispatch({ type: 'next' });
  };

  const person = 'person' in state ? state.person : null;
  const scanning = state.step === 'scanning';
  const cameraReady = permission?.granted === true && Platform.OS !== 'web';

  return (
    <Screen>
      {courseCode ? (
        <Text variant="secondary" tone="muted">
          Chỉ điểm danh cho khóa đang chọn.
        </Text>
      ) : null}

      {scanning ? (
        cameraReady ? (
          <View
            style={{
              aspectRatio: 1,
              overflow: 'hidden',
              borderRadius: radius.panel,
              backgroundColor: colors.surface2,
            }}
          >
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onBarcode}
            />
          </View>
        ) : Platform.OS === 'web' ? (
          <Banner
            tone="info"
            message="Trình duyệt không quét được mã QR. Nhập mã vào ô bên dưới."
          />
        ) : permission && !permission.granted ? (
          <Card>
            <Text variant="body">Cần cho phép dùng camera để quét mã QR điểm danh.</Text>
            <Button label="Cho phép dùng camera" onPress={() => void requestPermission()} />
          </Card>
        ) : null
      ) : null}

      {note ? <Banner tone="warning" message={note} /> : null}

      {state.step === 'looking' ? <Banner tone="info" message="Đang tra cứu mã…" /> : null}

      {state.step === 'error' ? (
        <>
          <Banner tone="danger" message={state.message} />
          <Button label="Quét tiếp" onPress={next} />
        </>
      ) : null}

      {person ? (
        <Card>
          <View style={{ gap: 8 }}>
            <Text variant="title" accessibilityRole="header">
              {[person.holyName, person.fullName].filter(Boolean).join(' ')}
            </Text>
            <InfoRow label="Khóa huấn luyện" value={person.courseName} />
            <InfoRow
              label="Giáo xứ / giáo hạt"
              value={[person.parishName, person.deaneryName].filter(Boolean).join(' · ')}
            />
            <InfoRow label="Đội" value={person.teamName} />
            {state.step === 'already' ? (
              <Banner
                tone="warning"
                message={`Đã điểm danh lúc ${formatDateTime(person.checkedInAt)}.`}
              />
            ) : null}
            {state.step === 'done' ? <Banner tone="info" message="Điểm danh thành công." /> : null}
          </View>
        </Card>
      ) : null}

      {state.step === 'confirm' || state.step === 'confirming' ? (
        <>
          <Button
            label="Xác nhận điểm danh"
            loading={state.step === 'confirming'}
            onPress={() => void confirm()}
          />
          <Button
            label="Bỏ qua"
            variant="outline"
            disabled={state.step === 'confirming'}
            onPress={() => dispatch({ type: 'skip' })}
          />
        </>
      ) : null}
      {state.step === 'done' || state.step === 'already' ? (
        <Button label="Quét tiếp" onPress={next} />
      ) : null}

      {scanning ? (
        <View style={{ gap: 8 }}>
          <TextField
            label="Hoặc nhập mã"
            value={manual}
            onChangeText={setManual}
            placeholder="HTATT2.…"
            autoCapitalize="none"
          />
          <Button
            label="Tra cứu mã"
            variant="outline"
            disabled={manual.trim() === ''}
            onPress={() => {
              void handleRaw(manual);
              setManual('');
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}
