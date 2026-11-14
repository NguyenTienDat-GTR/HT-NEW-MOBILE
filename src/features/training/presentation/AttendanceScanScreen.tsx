import { useQueryClient } from '@tanstack/react-query';
import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useReducer, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { errorMessage, isAppError } from '@/core/domain/app-error';
import { formatDateTime } from '@/core/domain/date-format';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { resourceKey } from '@/shared/resource/use-resource';
import { useTheme } from '@/shared/theme/theme-provider';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InfoRow } from '@/shared/ui/InfoRow';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import {
  CERTIFICATE_NOT_FOUND_MESSAGE,
  classifyScan,
  IMAGE_NO_QR_MESSAGE,
  IMAGE_UNREADABLE_MESSAGE,
  INITIAL_SCAN_FLOW,
  LEGACY_ATTENDANCE_MESSAGE,
  scanFlowReducer,
  shouldProcessScan,
  UNKNOWN_SCAN_MESSAGE,
  UNKNOWN_UNIVERSAL_SCAN_MESSAGE,
  type ScanGate,
  type ScanPerson,
} from '../domain/attendance-scan';

export interface AttendanceScanScreenProps {
  /** Có mã khóa = chỉ điểm danh cho khóa đó; không có = khóa nằm trong chính mã QR. */
  courseCode?: string;
  /** Mở chứng nhận khi quét mã QR chứng nhận (có khi người dùng được xem chứng nhận). */
  onCertificate?: (code: string) => void;
  /** Hiện tiêu đề trong trang (khi màn là một tab, không có thanh tiêu đề). */
  showTitle?: boolean;
}

const path = (courseCode: string | undefined, action: 'scan' | 'lookup') =>
  courseCode
    ? `/training/courses/${encodeURIComponent(courseCode)}/attendance/${action}`
    : `/training/attendance/${action}`;

/**
 * Quét mã QR như nút quét ở header web: camera đọc mã → mã điểm danh được tra cứu rồi chờ xác nhận, mã chứng nhận
 * được kiểm tra tồn tại rồi mở thẳng chi tiết. Camera chỉ bật khi màn đang được xem. Ngoài camera còn nhập/dán mã
 * (súng quét, máy không có camera) và chọn ảnh có mã QR.
 */
export function AttendanceScanScreen({
  courseCode,
  onCertificate,
  showTitle = false,
}: AttendanceScanScreenProps) {
  const gateway = useResourceGateway();
  const queryClient = useQueryClient();
  const { colors, radius } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, dispatch] = useReducer(scanFlowReducer, INITIAL_SCAN_FLOW);
  const gate = useRef<ScanGate>(null);
  const [manual, setManual] = useState('');
  const [focused, setFocused] = useState(false);
  const universal = !courseCode;

  // Camera chỉ chạy khi màn đang hiện (tab được chọn / chưa có màn nào đè lên), tắt khi rời đi để không giữ camera.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        gate.current = null;
      };
    }, []),
  );

  /** Kiểm tra chứng nhận tồn tại trước: không có thì báo ngay ở khung quét, có (kể cả đã thu hồi) thì sang chi tiết. */
  const openCertificate = async (code: string) => {
    if (!onCertificate) return;
    dispatch({ type: 'scanned', token: code });
    try {
      const detail = await gateway.get('/certificates', code);
      queryClient.setQueryData([...resourceKey('certificates'), 'row', code], detail);
      dispatch({ type: 'handed-off' });
      onCertificate(code);
    } catch (exception) {
      dispatch({
        type: 'failed',
        message:
          isAppError(exception) && exception.status === 404
            ? CERTIFICATE_NOT_FOUND_MESSAGE(code)
            : errorMessage(exception),
      });
    }
  };

  const handleRaw = async (raw: string) => {
    const payload = classifyScan(raw);
    if (payload.kind === 'attendance') {
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
    if (payload.kind === 'certificate' && universal && onCertificate) {
      await openCertificate(payload.code);
      return;
    }
    dispatch({
      type: 'failed',
      message:
        payload.kind === 'legacy-attendance'
          ? LEGACY_ATTENDANCE_MESSAGE
          : payload.kind === 'certificate'
            ? 'Đây là mã QR của chứng nhận, không phải mã điểm danh. Hãy quét mã trên thẻ tham dự.'
            : universal
              ? UNKNOWN_UNIVERSAL_SCAN_MESSAGE
              : UNKNOWN_SCAN_MESSAGE,
    });
  };

  const onBarcode = ({ data }: { data: string }) => {
    const now = Date.now();
    if (state.step !== 'scanning' || !shouldProcessScan(data, now, gate.current)) return;
    gate.current = { token: data, at: now };
    void handleRaw(data);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      const uri = result.canceled ? null : result.assets[0]?.uri;
      if (!uri) return;
      const found = await scanFromURLAsync(uri, ['qr']);
      const data = found[0]?.data;
      if (!data) {
        dispatch({ type: 'failed', message: IMAGE_NO_QR_MESSAGE });
        return;
      }
      gate.current = null;
      void handleRaw(data);
    } catch {
      dispatch({ type: 'failed', message: IMAGE_UNREADABLE_MESSAGE });
    }
  };

  const submitManual = () => {
    const code = manual.trim();
    if (code === '') return;
    setManual('');
    void openCertificate(code);
  };

  const confirm = async () => {
    if (state.step !== 'confirm') return;
    dispatch({ type: 'confirm' });
    try {
      const person = await gateway.call<ScanPerson>('POST', path(courseCode, 'scan'), {
        body: { token: state.token },
      });
      dispatch({ type: 'confirmed', person });
      // Số liệu điểm danh, tham dự, tổng quan đổi theo: làm mới các danh sách đang giữ trong bộ nhớ đệm.
      void queryClient.invalidateQueries({ queryKey: ['resource'] });
    } catch (exception) {
      dispatch({ type: 'failed', message: errorMessage(exception) });
    }
  };

  const next = () => {
    gate.current = null;
    dispatch({ type: 'next' });
  };

  const person = 'person' in state ? state.person : null;
  const name = person ? [person.holyName, person.fullName].filter(Boolean).join(' ') : '';
  const place = person ? [person.teamName, person.parishName].filter(Boolean).join(' · ') : '';
  const scanning = state.step === 'scanning';
  const showCamera = scanning || state.step === 'looking';
  const cameraReady = permission?.granted === true && Platform.OS !== 'web';

  return (
    <Screen>
      {showTitle ? (
        <Text variant="title" accessibilityRole="header">
          Quét mã QR
        </Text>
      ) : null}
      <Text variant="secondary" tone="muted">
        {courseCode
          ? 'Chỉ điểm danh cho khóa đang chọn. Đưa mã QR trên thẻ hoặc trong email vào khung hình, kiểm tra người được quét rồi xác nhận.'
          : 'Quét mã QR trên thẻ tham dự để điểm danh, hoặc mã QR trên chứng nhận để mở chi tiết chứng nhận.'}
      </Text>

      {showCamera ? (
        cameraReady ? (
          <View
            style={{
              aspectRatio: 1,
              overflow: 'hidden',
              borderRadius: radius.panel,
              backgroundColor: colors.surface2,
            }}
          >
            {focused ? (
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={onBarcode}
              />
            ) : null}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: '16%',
                left: '16%',
                right: '16%',
                bottom: '16%',
                borderWidth: 2,
                borderColor: colors.onSolid,
                borderRadius: radius.panel,
              }}
            />
            {state.step === 'looking' ? (
              <View
                style={{
                  ...absoluteFill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.overlay,
                }}
              >
                <Text variant="bodyStrong" tone="onSolid">
                  Đang kiểm tra mã…
                </Text>
              </View>
            ) : null}
          </View>
        ) : Platform.OS === 'web' ? (
          <Banner
            tone="info"
            message="Trình duyệt không quét được mã QR. Nhập mã vào ô bên dưới."
          />
        ) : permission && !permission.granted ? (
          <Card>
            <Text variant="body">
              Cần cho phép dùng camera để quét mã QR. Nếu không dùng được camera, bạn có thể chọn
              ảnh có mã QR hoặc nhập mã chứng nhận.
            </Text>
            <Button label="Cho phép dùng camera" onPress={() => void requestPermission()} />
          </Card>
        ) : null
      ) : null}

      {state.step === 'error' ? (
        <>
          <Banner tone="danger" message={state.message} />
          <Button label="Quét tiếp" onPress={next} />
        </>
      ) : null}

      {person ? (
        <Card>
          <View style={{ gap: 8 }}>
            <Text variant="label" tone="muted">
              {state.step === 'done'
                ? 'Đã điểm danh'
                : state.step === 'already'
                  ? 'Đã điểm danh trước đó'
                  : 'Xác nhận điểm danh'}
            </Text>
            <Text variant="title" accessibilityRole="header">
              {name}
            </Text>
            {place ? (
              <Text variant="secondary" tone="textSecondary">
                {place}
              </Text>
            ) : null}
            {universal ? <InfoRow label="Khóa huấn luyện" value={person.courseName} /> : null}
            {state.step === 'already' ? (
              <Banner
                tone="warning"
                message={`${name} đã điểm danh lúc ${formatDateTime(person.checkedInAt)}.`}
              />
            ) : null}
            {state.step === 'done' ? (
              <Banner tone="info" message={`${name} đã điểm danh thành công.`} />
            ) : null}
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

      {/* Không mở được camera: chỉ cho nhập mã chứng nhận (mã điểm danh luôn lấy từ mã QR nên không nhập tay). */}
      {scanning && !cameraReady && universal && onCertificate ? (
        <View style={{ gap: 8 }}>
          <TextField
            label="Nhập mã chứng nhận"
            value={manual}
            onChangeText={setManual}
            placeholder="Ví dụ GPPC-HTI-2026-1"
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={submitManual}
          />
          <Button
            label="Tra cứu chứng nhận"
            variant="outline"
            disabled={manual.trim() === ''}
            onPress={submitManual}
          />
        </View>
      ) : null}
      {scanning && Platform.OS !== 'web' ? (
        <Button label="Chọn ảnh có mã QR" variant="outline" onPress={() => void pickImage()} />
      ) : null}
    </Screen>
  );
}

const absoluteFill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
