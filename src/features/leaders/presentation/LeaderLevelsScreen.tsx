import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import type { PermissionSubject } from '@/core/domain/permissions';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { Badge } from '@/shared/ui/Badge';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmSheet } from '@/shared/ui/ConfirmSheet';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import {
  canMove,
  firstTierIsBase,
  LEVEL_CODE_PATTERN,
  moveLevel,
  toTiers,
} from '../domain/leader-level-order';
import {
  canCreateLeaderLevel,
  canDeleteLeaderLevel,
  canUpdateLeaderLevel,
} from '../domain/leader-permissions';

interface Level {
  levelCode: string;
  levelName: string;
  displayOrder: number;
  isSystem: boolean;
  description: string | null;
  previousNames: string[];
  courseTypeCount: number | null;
  deletable: boolean | null;
}

const KEY = ['leader-levels'] as const;

/**
 * Danh mục cấp độ huynh trưởng của giáo phận: danh sách ngắn (không phân trang), cấp cao nhất ở trên.
 * Chạm một cấp để sửa, đổi thứ tự (lên/xuống) hoặc xóa; thay cho kéo-thả của web vì nút lớn dễ bấm hơn.
 */
export function LeaderLevelsScreen({ subject }: { subject: PermissionSubject | null }) {
  const gateway = useResourceGateway();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => gateway.call<Level[]>('GET', '/leader-levels'),
  });
  const [selected, setSelected] = useState<Level | null>(null);
  const [editing, setEditing] = useState<Level | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Level | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const levels = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => b.displayOrder - a.displayOrder),
    [query.data],
  );
  const tiers = useMemo(() => toTiers(query.data ?? []), [query.data]);
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: KEY });
    await queryClient.invalidateQueries({ queryKey: ['leader-level-names'] });
    await queryClient.invalidateQueries({ queryKey: ['resource-options'] });
  };

  const run = async (action: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
      after?.();
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setBusy(false);
    }
  };

  const reorder = (level: Level, direction: 'up' | 'down') =>
    run(
      () =>
        gateway.call('PUT', '/leader-levels/reorder', {
          body: {
            tiers: moveLevel(tiers, level.levelCode, direction),
            firstTierBase: firstTierIsBase(query.data ?? []),
          },
        }),
      () => setSelected(null),
    );

  const canUpdate = canUpdateLeaderLevel(subject);

  return (
    <Screen
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
      footer={
        canCreateLeaderLevel(subject) ? (
          <Button label="Thêm cấp độ" onPress={() => setEditing('new')} />
        ) : undefined
      }
    >
      <Text variant="secondary" tone="muted">
        Cấp cao nhất nằm trên cùng. Cấp mới thêm vào sẽ nằm trên cùng, dùng nút Chuyển lên / Chuyển
        xuống để đổi vị trí.
      </Text>
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
      {query.data && levels.length === 0 ? <EmptyState title="Chưa có cấp độ nào" /> : null}
      {levels.map((level) => (
        <Card
          key={level.levelCode}
          onPress={() => setSelected(level)}
          accessibilityLabel={level.levelName}
        >
          <View style={{ gap: 4 }}>
            <Text variant="bodyStrong">{level.levelName}</Text>
            <Text variant="secondary" tone="muted">
              Mã {level.levelCode}
            </Text>
            <Text variant="secondary" tone="textSecondary">
              Điều kiện:{' '}
              {level.previousNames.length > 0
                ? `đang là ${level.previousNames.join(' hoặc ')}`
                : 'chưa đạt cấp nào'}
            </Text>
            {level.description ? (
              <Text variant="secondary" tone="muted">
                {level.description}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {level.isSystem ? <Badge label="Cấp khởi đầu" tone="info" /> : null}
              {(level.courseTypeCount ?? 0) > 0 ? (
                <Badge label={`${level.courseTypeCount} loại khóa`} tone="neutral" />
              ) : null}
            </View>
          </View>
        </Card>
      ))}

      <BottomSheet
        visible={selected !== null}
        title={selected?.levelName ?? ''}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <>
            {error ? <Banner tone="danger" message={error} /> : null}
            {canUpdate ? (
              <Button
                label="Sửa tên và mô tả"
                variant="outline"
                onPress={() => {
                  setEditing(selected);
                  setSelected(null);
                }}
              />
            ) : null}
            {canUpdate && !selected.isSystem ? (
              <>
                <Button
                  label="Chuyển lên cấp cao hơn"
                  variant="outline"
                  loading={busy}
                  disabled={!canMove(tiers, selected.levelCode, 'up')}
                  onPress={() => void reorder(selected, 'up')}
                />
                <Button
                  label="Chuyển xuống cấp thấp hơn"
                  variant="outline"
                  loading={busy}
                  disabled={!canMove(tiers, selected.levelCode, 'down')}
                  onPress={() => void reorder(selected, 'down')}
                />
              </>
            ) : null}
            {canDeleteLeaderLevel(subject) && !selected.isSystem ? (
              <>
                <Button
                  label="Xóa cấp độ"
                  variant="destructive"
                  disabled={selected.deletable !== true}
                  onPress={() => {
                    setDeleting(selected);
                    setSelected(null);
                  }}
                />
                {selected.deletable !== true ? (
                  <Text variant="secondary" tone="muted">
                    Đang được sử dụng nên không xóa được.
                  </Text>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </BottomSheet>

      <LevelFormSheet
        target={editing}
        busy={busy}
        error={editing ? error : null}
        onClose={() => {
          setEditing(null);
          setError(null);
        }}
        onSubmit={(body, code) =>
          void run(
            () =>
              code
                ? gateway.call('PUT', `/leader-levels/${encodeURIComponent(code)}`, {
                    body: { levelName: body.levelName, description: body.description },
                  })
                : gateway.call('POST', '/leader-levels', { body }),
            () => setEditing(null),
          )
        }
      />

      <ConfirmSheet
        visible={deleting !== null}
        title="Xóa cấp độ"
        message={`Xóa cấp độ "${deleting?.levelName ?? ''}" khỏi danh mục. Cấp độ chưa được dùng ở đâu nên việc xóa không ảnh hưởng dữ liệu.`}
        confirmLabel="Xóa"
        destructive
        loading={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting
            ? void run(
                () =>
                  gateway.call(
                    'DELETE',
                    `/leader-levels/${encodeURIComponent(deleting.levelCode)}`,
                  ),
                () => setDeleting(null),
              )
            : undefined
        }
      />
      {error && selected === null && editing === null && deleting === null ? (
        <Banner tone="danger" message={error} />
      ) : null}
    </Screen>
  );
}

function LevelFormSheet({
  target,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  target: Level | 'new' | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (
    body: { levelName: string; levelCode?: string; description: string | null },
    editingCode: string | null,
  ) => void;
}) {
  const existing = target && target !== 'new' ? target : null;
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [seen, setSeen] = useState<Level | 'new' | null>(null);
  const [invalid, setInvalid] = useState<{ name?: string; code?: string }>({});
  // Mỗi lần mở sheet nạp lại giá trị của cấp đang sửa (hoặc rỗng khi thêm mới).
  if (target !== seen) {
    setSeen(target);
    setName(existing?.levelName ?? '');
    setCode('');
    setDescription(existing?.description ?? '');
    setInvalid({});
  }

  const submit = () => {
    const found: { name?: string; code?: string } = {};
    if (name.trim() === '') found.name = 'Vui lòng nhập tên cấp độ';
    if (!existing && code.trim() !== '' && !LEVEL_CODE_PATTERN.test(code.trim()))
      found.code = 'Mã gồm chữ hoa, số, gạch dưới, bắt đầu bằng chữ (2-50 ký tự)';
    setInvalid(found);
    if (found.name || found.code) return;
    onSubmit(
      {
        levelName: name.trim(),
        ...(existing || code.trim() === '' ? {} : { levelCode: code.trim() }),
        description: description.trim() === '' ? null : description.trim(),
      },
      existing?.levelCode ?? null,
    );
  };

  return (
    <BottomSheet
      visible={target !== null}
      title={existing ? 'Sửa cấp độ' : 'Thêm cấp độ'}
      onClose={onClose}
      footer={
        <>
          <Button label="Lưu" loading={busy} onPress={submit} />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <TextField label="Tên cấp độ" value={name} onChangeText={setName} error={invalid.name} />
      {existing ? (
        <TextField
          label="Mã cấp độ"
          value={existing.levelCode}
          onChangeText={() => undefined}
          editable={false}
        />
      ) : (
        <TextField
          label="Mã cấp độ (không bắt buộc)"
          value={code}
          onChangeText={(value) => setCode(value.toUpperCase())}
          error={invalid.code}
          hint="Bỏ trống để hệ thống tự tạo từ tên."
          autoCapitalize="characters"
        />
      )}
      <TextField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      {error ? <Banner tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}
