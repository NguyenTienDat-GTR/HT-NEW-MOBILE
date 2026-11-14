import { useState } from 'react';
import { View } from 'react-native';

import { readEnv } from '@/core/config/env';
import { resolveMediaUrl } from '@/core/config/media-url';
import { uploadLeaderAvatar } from '@/shared/media/upload-media';
import { useResourceGateway } from '@/shared/resource/resource-context';
import type { CustomFieldProps } from '@/shared/resource/types';
import { Avatar } from '@/shared/ui/Avatar';
import { AvatarPickerSheet } from '@/shared/ui/AvatarPickerSheet';
import { Button } from '@/shared/ui/Button';
import { FieldLabel } from '@/shared/ui/FieldLabel';
import { Text } from '@/shared/ui/Text';

/**
 * Ô ảnh đại diện trong biểu mẫu huynh trưởng (như web): xem ảnh hiện tại, "Thay đổi ảnh" để chọn và tải ảnh mới. Giá
 * trị của ô là id ảnh vừa tải lên (gửi cùng hồ sơ); chỉ thay được, không xóa được ảnh.
 */
export function LeaderAvatarField({ value, values, onChange, locked }: CustomFieldProps) {
  const gateway = useResourceGateway();
  const [open, setOpen] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const current = resolveMediaUrl(readEnv().apiBaseUrl, String(values.imageUrl ?? '')) ?? null;
  const shown = previewUri ?? current;
  const name = String(values.fullName ?? values.holyName ?? 'HT');
  return (
    <View style={{ gap: 8 }}>
      <FieldLabel label="Ảnh đại diện" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={name} size={64} uri={shown} />
        <View style={{ flex: 1, gap: 6 }}>
          <Button
            label={shown ? 'Thay đổi ảnh' : 'Thêm ảnh'}
            variant="outline"
            disabled={locked}
            onPress={() => setOpen(true)}
          />
          {value ? (
            <Text variant="secondary" tone="muted">
              Ảnh mới sẽ được lưu khi bạn lưu hồ sơ.
            </Text>
          ) : null}
        </View>
      </View>
      <AvatarPickerSheet
        visible={open}
        currentUri={shown}
        onClose={() => setOpen(false)}
        onConfirm={async (file) => {
          const uploaded = await uploadLeaderAvatar(gateway, file);
          setPreviewUri(file.uri);
          onChange(uploaded.assetId);
        }}
      />
    </View>
  );
}
