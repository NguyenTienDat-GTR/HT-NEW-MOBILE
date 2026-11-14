import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { formatDate, formatDateTime } from '@/core/domain/date-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { text } from '@/shared/resource/row';
import { Badge } from '@/shared/ui/Badge';
import { Banner } from '@/shared/ui/Banner';
import { Card } from '@/shared/ui/Card';
import { InfoRow } from '@/shared/ui/InfoRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Text } from '@/shared/ui/Text';

export type UnitKind = 'dioceses' | 'deaneries' | 'parishes';

const UNIT_TYPE: Record<UnitKind, string> = {
  dioceses: 'DIOCESE',
  deaneries: 'DEANERY',
  parishes: 'PARISH',
};

/**
 * Hai khối cuối màn chi tiết đơn vị (như UnitDetail của web): ban điều hành của đơn vị và lịch sử bật / tắt.
 * Dựng lại từ API `/executive-board/boards/<cấp>/<mã>` và `/<đơn vị>/<mã>/status-history`.
 */
export function UnitExtras({ kind, row }: { kind: UnitKind; row: ResourceRow }) {
  const id = text(row, 'id');
  return (
    <>
      <ExecutiveBoard kind={kind} unitId={id} />
      <StatusHistory kind={kind} unitId={id} />
    </>
  );
}

function ExecutiveBoard({ kind, unitId }: { kind: UnitKind; unitId: string }) {
  const gateway = useResourceGateway();
  const query = useQuery({
    queryKey: ['executive-board-seats', UNIT_TYPE[kind], unitId],
    queryFn: () =>
      gateway.call<ResourceRow[]>(
        'GET',
        `/executive-board/boards/${UNIT_TYPE[kind]}/${encodeURIComponent(unitId)}`,
      ),
  });
  const seats = query.data ?? [];
  const assigned = seats.filter((seat) => seat.assigned === true).length;
  // Đơn vị của huynh trưởng theo phạm vi đang xem: giáo phận thấy giáo xứ + giáo hạt, giáo hạt thấy giáo xứ.
  const showParish = kind !== 'parishes';
  const showDeanery = kind === 'dioceses';

  return (
    <Card>
      <View style={{ gap: 12 }}>
        <Text variant="heading" accessibilityRole="header">
          Ban điều hành
        </Text>
        {query.data ? (
          <Text
            variant="secondary"
            tone="muted"
          >{`${assigned}/${seats.length} vị trí đã có người`}</Text>
        ) : null}
        {query.isPending ? <LoadingState /> : null}
        {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
        {query.data && seats.length === 0 ? (
          <Text variant="secondary" tone="muted">
            Chưa có chức vụ nào đang hoạt động ở cấp này.
          </Text>
        ) : null}
        {seats.map((seat) => (
          <Seat
            key={text(seat, 'positionCode')}
            seat={seat}
            showParish={showParish}
            showDeanery={showDeanery}
          />
        ))}
      </View>
    </Card>
  );
}

function Seat({
  seat,
  showParish,
  showDeanery,
}: {
  seat: ResourceRow;
  showParish: boolean;
  showDeanery: boolean;
}) {
  const chaplain = seat.chaplain === true;
  const assigned = seat.assigned === true;
  const name = [text(seat, 'leaderHolyName'), text(seat, 'leaderFullName')]
    .filter(Boolean)
    .join(' ');
  const unitLine = [
    showParish ? text(seat, 'leaderParishName') : '',
    showDeanery ? text(seat, 'leaderDeaneryName') : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text variant="bodyStrong" style={{ flexShrink: 1 }}>
          {text(seat, 'positionName')}
        </Text>
        <Badge
          label={
            assigned
              ? chaplain
                ? 'Đã cập nhật'
                : 'Đã phân công'
              : chaplain
                ? 'Chưa cập nhật'
                : 'Chưa phân công'
          }
          tone={assigned ? 'success' : 'neutral'}
        />
      </View>
      {assigned ? (
        <>
          <Text variant="body">{name || '—'}</Text>
          {unitLine ? (
            <Text variant="secondary" tone="muted">
              {unitLine}
            </Text>
          ) : null}
          {chaplain ? null : (
            <>
              <InfoRow label="Email" value={text(seat, 'leaderEmail')} />
              <InfoRow label="Số điện thoại" value={text(seat, 'leaderPhoneNumber')} />
              <InfoRow label="Bắt đầu" value={formatDate(text(seat, 'startDate'))} />
              <InfoRow
                label="Kết thúc"
                value={text(seat, 'endDate') ? formatDate(text(seat, 'endDate')) : 'Chưa xác định'}
              />
            </>
          )}
        </>
      ) : (
        <Text variant="secondary" tone="muted">
          {chaplain
            ? 'Chưa cập nhật linh mục tuyên úy của đơn vị.'
            : 'Chưa có huynh trưởng được phân công.'}
        </Text>
      )}
    </View>
  );
}

function StatusHistory({ kind, unitId }: { kind: UnitKind; unitId: string }) {
  const gateway = useResourceGateway();
  const query = useQuery({
    queryKey: ['unit-status-history', kind, unitId],
    queryFn: () =>
      gateway.call<ResourceRow[]>('GET', `/${kind}/${encodeURIComponent(unitId)}/status-history`),
  });
  return (
    <Card>
      <View style={{ gap: 12 }}>
        <Text variant="heading" accessibilityRole="header">
          Lịch sử bật / tắt
        </Text>
        {query.isPending ? <LoadingState /> : null}
        {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
        {query.data && query.data.length === 0 ? (
          <Text variant="secondary" tone="muted">
            Chưa có lịch sử.
          </Text>
        ) : null}
        {(query.data ?? []).map((item) => {
          const active = item.status === true;
          return (
            <View key={text(item, 'id')} style={{ gap: 4 }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
              >
                <Badge
                  label={active ? 'Hoạt động' : 'Ngưng hoạt động'}
                  tone={active ? 'success' : 'neutral'}
                />
                <Text variant="secondary" tone="muted">
                  {formatDateTime(text(item, 'changedAt')) || '—'}
                </Text>
              </View>
              {text(item, 'changedBy') ? (
                <Text
                  variant="secondary"
                  tone="muted"
                >{`Người thay đổi: ${text(item, 'changedBy')}`}</Text>
              ) : null}
              {item.eventType === 'BASELINE' ? (
                <Text variant="secondary" tone="muted">
                  Trạng thái ban đầu
                </Text>
              ) : null}
              {text(item, 'reason') ? (
                <Text variant="body">{`Lý do: ${text(item, 'reason')}`}</Text>
              ) : null}
              {item.eventType === 'TOGGLE' && !active ? (
                <Text variant="secondary" tone="muted">
                  {`Ảnh hưởng ${text(item, 'affectedAccountCount') || '0'} tài khoản, ${text(item, 'affectedChildUnitCount') || '0'} đơn vị con`}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}
