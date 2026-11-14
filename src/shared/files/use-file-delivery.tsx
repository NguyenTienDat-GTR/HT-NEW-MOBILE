import { useCallback, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import type { DownloadedBytes } from '@/core/network/http-client';

import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { useToast } from '../ui/Toast';

import { saveDownloadedFile, shareDownloadedFile } from './share-file';

interface Pending {
  file: DownloadedBytes;
  filename: string;
  title: string;
}

/**
 * Giao tệp vừa tải về cho người dùng: sheet "Tệp đã sẵn sàng" cho chọn "Lưu vào máy" (chọn thư mục, tải về máy) hoặc
 * "Chia sẻ" (hộp chia sẻ của hệ điều hành: Zalo, mail, in…). `offer` mở sheet; `sheet` phải được dựng trong màn hình.
 */
export function useFileDelivery(): {
  offer: (file: DownloadedBytes, filename: string, title: string) => void;
  sheet: ReactNode;
} {
  const toast = useToast();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);

  const offer = useCallback(
    (file: DownloadedBytes, filename: string, title: string) =>
      setPending({ file, filename, title }),
    [],
  );

  const run = async (mode: 'save' | 'share') => {
    if (!pending) return;
    setBusy(mode);
    try {
      if (mode === 'save') {
        const saved = await saveDownloadedFile(pending.file, pending.filename);
        if (saved === 'cancelled') return;
        toast.success('Đã lưu tệp vào máy');
      } else {
        const shared = await shareDownloadedFile(pending.file, pending.filename, pending.title);
        if (!shared) {
          toast.error('Thiết bị này không hỗ trợ chia sẻ tệp.');
          return;
        }
      }
      setPending(null);
    } catch (exception) {
      toast.error(errorMessage(exception));
    } finally {
      setBusy(null);
    }
  };

  const sheet = (
    <BottomSheet
      visible={pending !== null}
      title="Tệp đã sẵn sàng"
      onClose={() => (busy ? undefined : setPending(null))}
      footer={
        <>
          <Button
            label="Lưu vào máy"
            loading={busy === 'save'}
            disabled={busy !== null}
            onPress={() => void run('save')}
          />
          <Button
            label="Chia sẻ"
            variant="outline"
            loading={busy === 'share'}
            disabled={busy !== null}
            onPress={() => void run('share')}
          />
          <Button
            label="Đóng"
            variant="ghost"
            size="sm"
            disabled={busy !== null}
            onPress={() => setPending(null)}
          />
        </>
      }
    >
      <View style={{ gap: 8 }}>
        <Text variant="bodyStrong">{pending?.title}</Text>
        <Text variant="secondary" tone="muted">
          {pending?.filename}
        </Text>
        <Text variant="secondary" tone="muted">
          {
            'Chọn "Lưu vào máy" để tải tệp về thư mục bạn chọn, hoặc "Chia sẻ" để gửi qua ứng dụng khác.'
          }
        </Text>
      </View>
    </BottomSheet>
  );

  return { offer, sheet };
}
