import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { formatDate } from '@/core/domain/date-format';
import type { PermissionSubject } from '@/core/domain/permissions';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { todayIso } from '@/shared/resource/form-logic';
import { loadOptions } from '@/shared/resource/options';
import { ToggleSheet } from '@/shared/resource/ResourceDetailScreen';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { flag, text } from '@/shared/resource/row';
import type { ResourceDefinition } from '@/shared/resource/types';
import { resourceKey } from '@/shared/resource/use-resource';
import { Badge } from '@/shared/ui/Badge';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DateField } from '@/shared/ui/DateField';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FilterChips } from '@/shared/ui/FilterChips';
import { InfoRow } from '@/shared/ui/InfoRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Screen } from '@/shared/ui/Screen';
import { SelectField } from '@/shared/ui/SelectField';
import { Text } from '@/shared/ui/Text';

import { genderLabel, levelLabel, parishOptionLabel, rankSentence } from '../domain/leader-labels';
import {
  canReadLeaderCertificates,
  canToggleLeader,
  canTransferLeader,
  canUpdateLeader,
  canUpdateLeaderBirthDate,
} from '../domain/leader-permissions';

type Tab = 'info' | 'training' | 'certificates' | 'accounts';

const TABS = [
  { value: 'info', label: 'Cá nhân' },
  { value: 'training', label: 'Khóa HL' },
  { value: 'certificates', label: 'Chứng nhận' },
  { value: 'accounts', label: 'Tài khoản' },
] as const;

export interface LeaderDetailScreenProps {
  def: ResourceDefinition;
  id: string;
  subject: PermissionSubject | null;
  onEdit: () => void;
}

/** Tên cấp theo danh mục của giáo phận (tra mã -> tên). */
function useLevelNames() {
  const gateway = useResourceGateway();
  const query = useQuery({
    queryKey: ['leader-level-names'],
    queryFn: () =>
      gateway.call<{ levelCode: string; levelName: string }[]>('GET', '/leader-levels/options'),
    staleTime: 10 * 60_000,
  });
  return useMemo(
    () => new Map((query.data ?? []).map((level) => [level.levelCode, level.levelName])),
    [query.data],
  );
}

/**
 * Chi tiết huynh trưởng: đầu trang (tên, cấp, trạng thái, nút thao tác theo quyền) và 4 tab —
 * thông tin cá nhân + lịch sử cấp bậc, khóa huấn luyện, chứng nhận, tài khoản.
 */
export function LeaderDetailScreen({ def, id, subject, onEdit }: LeaderDetailScreenProps) {
  const gateway = useResourceGateway();
  const levelNames = useLevelNames();
  const [tab, setTab] = useState<Tab>('info');
  const [toggleOpen, setToggleOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [birthOpen, setBirthOpen] = useState(false);

  const query = useQuery({
    queryKey: [...resourceKey('leaders'), 'row', id],
    queryFn: () => gateway.get('/leaders', id),
  });
  const leader = query.data;

  if (query.isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (query.isError || !leader) {
    return (
      <Screen onRefresh={() => void query.refetch()}>
        <Banner tone="danger" message={errorMessage(query.error)} />
        <Button label="Thử lại" variant="outline" onPress={() => void query.refetch()} />
      </Screen>
    );
  }

  const active = flag(leader, 'status');
  const name = [text(leader, 'holyName'), text(leader, 'fullName')].filter(Boolean).join(' ');

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Card>
        <View style={{ gap: 8 }}>
          <Text variant="title" accessibilityRole="header">
            {name}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Badge label={levelLabel(text(leader, 'leaderLevel'), levelNames)} tone="info" />
            <Badge
              label={active ? 'Đang hoạt động' : 'Tạm ngưng'}
              tone={active ? 'success' : 'warning'}
            />
          </View>
          <Text variant="secondary" tone="textSecondary">
            {[
              text(leader, 'subUnitName') || text(leader, 'parishName'),
              text(leader, 'deaneryName'),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {canUpdateLeader(subject) ? (
            <Button label="Sửa thông tin hồ sơ" variant="outline" onPress={onEdit} />
          ) : null}
          {canUpdateLeaderBirthDate(subject) ? (
            <Button label="Sửa ngày sinh" variant="outline" onPress={() => setBirthOpen(true)} />
          ) : null}
          {canTransferLeader(subject) ? (
            <Button
              label="Chuyển giáo xứ"
              variant="outline"
              onPress={() => setTransferOpen(true)}
            />
          ) : null}
        </View>
      </Card>

      <FilterChips options={TABS} value={tab} onChange={setTab} />

      {tab === 'info' ? <InfoTab leader={leader} id={id} levelNames={levelNames} /> : null}
      {tab === 'training' ? <TrainingTab id={id} /> : null}
      {tab === 'certificates' ? <CertificatesTab id={id} subject={subject} /> : null}
      {tab === 'accounts' ? <AccountsTab id={id} fullName={text(leader, 'fullName')} /> : null}

      {canToggleLeader(subject) && def.toggle ? (
        <Button
          label={def.toggle.label(leader)}
          variant={active ? 'destructive' : 'outline'}
          onPress={() => setToggleOpen(true)}
        />
      ) : null}
      <ToggleSheet
        def={def}
        row={leader}
        visible={toggleOpen}
        onClose={() => setToggleOpen(false)}
      />
      <TransferSheet
        leader={leader}
        id={id}
        visible={transferOpen}
        onClose={() => setTransferOpen(false)}
      />
      <BirthDateSheet
        leader={leader}
        id={id}
        visible={birthOpen}
        onClose={() => setBirthOpen(false)}
      />
    </Screen>
  );
}

function QueryState({
  query,
  empty,
  children,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown; data: unknown };
  empty: string;
  children: React.ReactNode;
}) {
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <Banner tone="danger" message={errorMessage(query.error)} />;
  if (Array.isArray(query.data) && query.data.length === 0) return <EmptyState title={empty} />;
  return <>{children}</>;
}

function InfoTab({
  leader,
  id,
  levelNames,
}: {
  leader: ResourceRow;
  id: string;
  levelNames: ReadonlyMap<string, string>;
}) {
  const gateway = useResourceGateway();
  const history = useQuery({
    queryKey: ['leader-rank-history', id],
    queryFn: () =>
      gateway.call<ResourceRow[]>('GET', `/leaders/${encodeURIComponent(id)}/rank-history`),
  });
  const sorted = useMemo(
    () =>
      [...(history.data ?? [])].sort((a, b) =>
        text(b, 'promotionDate').localeCompare(text(a, 'promotionDate')),
      ),
    [history.data],
  );
  return (
    <>
      <Card>
        <View style={{ gap: 12 }}>
          <InfoRow label="Tên thánh" value={text(leader, 'holyName')} />
          <InfoRow label="Họ và tên" value={text(leader, 'fullName')} />
          <InfoRow label="Giới tính" value={genderLabel(text(leader, 'gender'))} />
          <InfoRow label="Ngày sinh" value={formatDate(text(leader, 'birthDate'))} />
          <InfoRow label="Số điện thoại" value={text(leader, 'phoneNumber')} />
          <InfoRow label="Email" value={text(leader, 'email')} />
          <InfoRow label="Giáo xứ / họ / điểm" value={text(leader, 'parishName')} />
          <InfoRow label="Giáo hạt" value={text(leader, 'deaneryName')} />
          <InfoRow
            label="Cấp huynh trưởng"
            value={levelLabel(text(leader, 'leaderLevel'), levelNames)}
          />
          <InfoRow
            label="Tạo"
            value={[text(leader, 'createdByName'), formatDate(text(leader, 'createdAt'))]
              .filter(Boolean)
              .join(' · ')}
          />
          <InfoRow
            label="Cập nhật"
            value={[text(leader, 'updatedByName'), formatDate(text(leader, 'updatedAt'))]
              .filter(Boolean)
              .join(' · ')}
          />
        </View>
      </Card>
      <Card>
        <Text variant="heading" accessibilityRole="header">
          Lịch sử cấp bậc
        </Text>
        <QueryState query={history} empty="Chưa có lịch sử cấp bậc">
          <View style={{ gap: 12 }}>
            {sorted.map((item) => (
              <InfoRow
                key={String(item.id)}
                label={formatDate(text(item, 'promotionDate'))}
                value={[
                  rankSentence(text(item, 'newLevel'), text(item, 'promotionDate'), levelNames),
                  text(item, 'courseName'),
                  text(item, 'note'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ))}
          </View>
        </QueryState>
      </Card>
    </>
  );
}

function TrainingTab({ id }: { id: string }) {
  const gateway = useResourceGateway();
  const query = useQuery({
    queryKey: ['leader-participations', id],
    queryFn: () =>
      gateway.list('/training/participations', {
        page: 0,
        size: 20,
        filters: { 'leader.id': id },
        sortBy: 'registrationDate',
        sortDirection: 'DESC',
      }),
  });
  const rows = query.data?.content ?? [];
  return (
    <QueryState
      query={{ ...query, data: query.data ? rows : undefined }}
      empty="Chưa tham gia khóa huấn luyện nào"
    >
      {rows.map((row) => {
        const hidden = flag(row, 'scoreHidden');
        const total = row.totalScore;
        const score = hidden
          ? 'Không hiển thị'
          : total === null || total === undefined
            ? 'Chưa có'
            : `${String(total)}/${String(row.passingScore ?? '')}`;
        const result =
          row.passed === true ? 'Đạt' : row.passed === false ? 'Không đạt' : text(row, 'result');
        return (
          <Card key={String(row.id)}>
            <Text variant="bodyStrong">{text(row, 'courseName') || text(row, 'courseCode')}</Text>
            <InfoRow label="Ngày đăng ký" value={formatDate(text(row, 'registrationDate'))} />
            <InfoRow label="Điểm" value={score} />
            <InfoRow label="Kết quả" value={result} />
            <InfoRow label="Nhận xét" value={text(row, 'scoreNote')} />
          </Card>
        );
      })}
    </QueryState>
  );
}

function CertificatesTab({ id, subject }: { id: string; subject: PermissionSubject | null }) {
  const gateway = useResourceGateway();
  const own = canReadLeaderCertificates(subject);
  const query = useQuery({
    queryKey: ['leader-certificates', id, own],
    queryFn: async (): Promise<ResourceRow[]> =>
      own
        ? gateway.call<ResourceRow[]>('GET', `/leaders/${encodeURIComponent(id)}/certificates`)
        : (
            await gateway.list('/certificates', {
              page: 0,
              size: 20,
              filters: { 'leader.id': id },
              sortBy: 'issueDate',
              sortDirection: 'DESC',
            })
          ).content,
  });
  return (
    <QueryState query={query} empty="Chưa có chứng nhận nào">
      {(query.data ?? []).map((row) => (
        <Card key={text(row, 'certificateCode')}>
          <Text variant="bodyStrong">{text(row, 'certificateName')}</Text>
          <InfoRow
            label="Khóa huấn luyện"
            value={text(row, 'courseName') || text(row, 'courseCode')}
          />
          <InfoRow label="Mã chứng nhận" value={text(row, 'certificateCode')} />
          <InfoRow label="Ngày cấp" value={formatDate(text(row, 'issueDate'))} />
          <InfoRow label="Người ký" value={text(row, 'signedBy')} />
        </Card>
      ))}
    </QueryState>
  );
}

function AccountsTab({ id, fullName }: { id: string; fullName: string }) {
  const gateway = useResourceGateway();
  const query = useQuery({
    queryKey: ['leader-accounts', id],
    queryFn: async () =>
      (
        await gateway.list('/system/accounts', { page: 0, size: 20, search: fullName })
      ).content.filter((account) => text(account, 'leaderId') === id),
  });
  return (
    <QueryState query={query} empty="Huynh trưởng chưa có tài khoản">
      {(query.data ?? []).map((account) => (
        <Card key={text(account, 'username')}>
          <Text variant="bodyStrong">{text(account, 'username')}</Text>
          <InfoRow label="Vai trò chính" value={text(account, 'primaryRoleName')} />
          <InfoRow
            label="Vai trò phụ"
            value={
              Array.isArray(account.secondaryRoleNames)
                ? (account.secondaryRoleNames as string[]).join(', ')
                : ''
            }
          />
          <InfoRow
            label="Trạng thái"
            value={flag(account, 'status') ? 'Đang hoạt động' : 'Tạm ngưng'}
          />
        </Card>
      ))}
    </QueryState>
  );
}

function useMutationSheet(onDone: () => void) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: resourceKey('leaders') });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>) => {
    setPending(true);
    setError(null);
    try {
      await action();
      await invalidate();
      onDone();
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setPending(false);
    }
  };
  return { pending, error, run, reset: () => setError(null) };
}

function TransferSheet({
  leader,
  id,
  visible,
  onClose,
}: {
  leader: ResourceRow;
  id: string;
  visible: boolean;
  onClose: () => void;
}) {
  const gateway = useResourceGateway();
  const [deaneryId, setDeaneryId] = useState(text(leader, 'deaneryId'));
  const [parishId, setParishId] = useState('');
  const { pending, error, run } = useMutationSheet(() => {
    setParishId('');
    onClose();
  });

  const deaneries = useQuery({
    queryKey: ['transfer-deaneries'],
    queryFn: () => loadOptions(gateway, '/deaneries', { value: 'id', label: 'name' }),
    enabled: visible,
  });
  const parishes = useQuery({
    queryKey: ['transfer-parishes', deaneryId],
    queryFn: () =>
      loadOptions(
        gateway,
        '/parishes',
        { value: 'id', label: parishOptionLabel },
        { filters: deaneryId ? { 'deanery.id': deaneryId } : {}, status: true },
      ),
    enabled: visible,
  });
  const currentParish = text(leader, 'parishId');
  const options = (parishes.data ?? []).filter((option) => option.value !== currentParish);

  return (
    <BottomSheet
      visible={visible}
      title="Chuyển giáo xứ"
      onClose={onClose}
      footer={
        <>
          <Button
            label="Chuyển"
            loading={pending}
            disabled={parishId === ''}
            onPress={() =>
              void run(() =>
                gateway.call('POST', `/leaders/${encodeURIComponent(id)}/transfer`, {
                  body: { parishId },
                }),
              )
            }
          />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <Text variant="body" tone="textSecondary">
        Chuyển huynh trưởng sang giáo xứ / họ / điểm đang hoạt động khác. Chỉ chuyển trong phạm vi
        bạn quản lý.
      </Text>
      {(deaneries.data?.length ?? 0) > 1 ? (
        <SelectField
          label="Giáo hạt"
          value={deaneryId}
          options={deaneries.data ?? []}
          allowClear={false}
          onChange={(value) => {
            setDeaneryId(value);
            setParishId('');
          }}
        />
      ) : null}
      <SelectField
        label="Giáo xứ / họ / điểm mới"
        value={parishId}
        options={options}
        placeholder={parishes.isPending ? 'Đang tải…' : 'Chọn đơn vị'}
        allowClear={false}
        onChange={setParishId}
      />
      {error ? <Banner tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}

function BirthDateSheet({
  leader,
  id,
  visible,
  onClose,
}: {
  leader: ResourceRow;
  id: string;
  visible: boolean;
  onClose: () => void;
}) {
  const gateway = useResourceGateway();
  const [value, setValue] = useState(text(leader, 'birthDate'));
  const { pending, error, run } = useMutationSheet(onClose);

  return (
    <BottomSheet
      visible={visible}
      title="Sửa ngày sinh"
      onClose={onClose}
      footer={
        <>
          <Button
            label="Lưu"
            loading={pending}
            disabled={value === '' || value === text(leader, 'birthDate')}
            onPress={() =>
              void run(() =>
                gateway.call('PATCH', `/leaders/${encodeURIComponent(id)}/birth-date`, {
                  body: { birthDate: value },
                }),
              )
            }
          />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <DateField label="Ngày sinh" value={value} onChange={setValue} maximumDate={todayIso()} />
      {error ? <Banner tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}
