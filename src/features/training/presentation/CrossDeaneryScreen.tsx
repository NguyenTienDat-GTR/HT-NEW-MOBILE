import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { formatDate, formatDateTime } from '@/core/domain/date-format';
import type { ResourceRow } from '@/core/resource/resource-gateway';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { flag, text } from '@/shared/resource/row';
import type { PermissionSubject } from '@/shared/resource/types';
import { Badge } from '@/shared/ui/Badge';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { CheckboxRow } from '@/shared/ui/CheckboxRow';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FilterChips } from '@/shared/ui/FilterChips';
import { InfoRow } from '@/shared/ui/InfoRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Screen } from '@/shared/ui/Screen';
import { SelectField } from '@/shared/ui/SelectField';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import {
  buildDecision,
  buildItems,
  candidateName,
  canApproveCrossDeanery,
  canSubmitCrossDeanery,
  EMPTY_DRAFT,
  missingReasons,
  REQUEST_STATUS,
  type CrossCandidate,
  type ItemDraft,
} from '../domain/cross-deanery';

type Tab = 'requests' | 'send' | 'invitations';

const BASE = '/training/cross-deanery';
const KEY = ['cross-deanery'] as const;

/**
 * Gửi liên giáo hạt: giáo xứ gửi huynh trưởng sang khóa của giáo hạt khác (cùng giáo phận); giáo hạt nhà đồng ý cho
 * giáo xứ của mình gửi (tab Khóa mời) rồi giáo hạt tổ chức duyệt từng yêu cầu (tab Yêu cầu).
 */
export function CrossDeaneryScreen({ subject }: { subject: PermissionSubject | null }) {
  const canSend = canSubmitCrossDeanery(subject);
  const canDecide = canApproveCrossDeanery(subject);
  const tabs: { value: Tab; label: string }[] = [
    { value: 'requests', label: 'Yêu cầu' },
    ...(canSend ? [{ value: 'send' as const, label: 'Gửi mới' }] : []),
    ...(canDecide ? [{ value: 'invitations' as const, label: 'Khóa mời' }] : []),
  ];
  const [tab, setTab] = useState<Tab>('requests');

  return (
    <Screen>
      <FilterChips options={tabs} value={tab} onChange={setTab} />
      {tab === 'requests' ? <RequestsTab /> : null}
      {tab === 'send' ? <SendTab onSent={() => setTab('requests')} /> : null}
      {tab === 'invitations' ? <InvitationsTab /> : null}
    </Screen>
  );
}

function RequestsTab() {
  const gateway = useResourceGateway();
  const [selected, setSelected] = useState<ResourceRow | null>(null);
  const query = useQuery({
    queryKey: [...KEY, 'requests'],
    queryFn: () => gateway.call<ResourceRow[]>('GET', `${BASE}/requests`),
  });
  const rows = query.data ?? [];
  return (
    <>
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
      {query.data && rows.length === 0 ? (
        <EmptyState title="Chưa có yêu cầu liên giáo hạt" />
      ) : null}
      {rows.map((row) => {
        const status = REQUEST_STATUS[text(row, 'requestStatus')] ?? {
          label: text(row, 'requestStatus'),
          tone: 'neutral' as const,
        };
        const items = Array.isArray(row.items) ? (row.items as ResourceRow[]) : [];
        return (
          <Card key={text(row, 'id')} onPress={() => setSelected(row)}>
            <View style={{ gap: 2 }}>
              <Text variant="bodyStrong">{text(row, 'courseName')}</Text>
              <Text variant="secondary" tone="textSecondary">
                {`${text(row, 'homeDeaneryName')} → ${text(row, 'courseDeaneryName')}`}
              </Text>
              <Text variant="secondary" tone="muted">
                {`${text(row, 'parishName')} · ${items.length} huynh trưởng`}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Badge label={status.label} tone={status.tone} />
              </View>
            </View>
          </Card>
        );
      })}
      <RequestSheet row={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function RequestSheet({ row, onClose }: { row: ResourceRow | null; onClose: () => void }) {
  const gateway = useResourceGateway();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seen, setSeen] = useState<ResourceRow | null>(null);
  const items = row && Array.isArray(row.items) ? (row.items as ResourceRow[]) : [];
  const pendingItems = items.filter((item) => item.itemStatus === 'PENDING');
  if (row !== seen) {
    setSeen(row);
    setNote('');
    setError(null);
    setChosen(new Set(pendingItems.map((item) => text(item, 'id'))));
  }

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: KEY });
      onClose();
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setBusy(false);
    }
  };
  const decide = (approved: boolean) => {
    if (!row) return;
    const { body, error: problem } = buildDecision(
      approved,
      note,
      [...chosen],
      pendingItems.map((item) => text(item, 'id')),
    );
    if (problem) return setError(problem);
    void run(() =>
      gateway.call('POST', `${BASE}/requests/${encodeURIComponent(text(row, 'id'))}/decision`, {
        body,
      }),
    );
  };

  const status = row ? REQUEST_STATUS[text(row, 'requestStatus')] : undefined;
  return (
    <BottomSheet
      visible={row !== null}
      title={row ? text(row, 'courseName') : ''}
      onClose={onClose}
      footer={
        row && flag(row, 'canDecide') ? (
          <>
            <Button label="Đồng ý" loading={busy} onPress={() => decide(true)} />
            <Button
              label="Từ chối cả yêu cầu"
              variant="destructive"
              disabled={busy}
              onPress={() => decide(false)}
            />
          </>
        ) : row && flag(row, 'canCancel') ? (
          <Button
            label="Hủy yêu cầu"
            variant="destructive"
            loading={busy}
            onPress={() =>
              void run(() =>
                gateway.call('DELETE', `${BASE}/requests/${encodeURIComponent(text(row, 'id'))}`),
              )
            }
          />
        ) : undefined
      }
    >
      {row ? (
        <>
          <InfoRow label="Trạng thái" value={status?.label ?? text(row, 'requestStatus')} />
          <InfoRow label="Giáo hạt gửi" value={text(row, 'homeDeaneryName')} />
          <InfoRow label="Giáo hạt tổ chức" value={text(row, 'courseDeaneryName')} />
          <InfoRow label="Giáo xứ" value={text(row, 'parishName')} />
          <InfoRow
            label="Người gửi"
            value={`${text(row, 'createdByName')} · ${formatDateTime(text(row, 'createdAt'))}`}
          />
          {text(row, 'decisionNote') ? (
            <InfoRow
              label={`Ghi chú của ${text(row, 'decidedByName') || 'người quyết định'}`}
              value={text(row, 'decisionNote')}
            />
          ) : null}
          <Text variant="heading" accessibilityRole="header">
            {`Huynh trưởng (${items.length})`}
          </Text>
          {items.map((item) => {
            const id = text(item, 'id');
            const pending = item.itemStatus === 'PENDING';
            const label = `${[text(item, 'holyName'), text(item, 'fullName')].filter(Boolean).join(' ')} — ${text(item, 'parishName')}`;
            return (
              <View key={id} style={{ gap: 2 }}>
                {flag(row, 'canDecide') && pending ? (
                  <CheckboxRow
                    label={label}
                    checked={chosen.has(id)}
                    onChange={(on) =>
                      setChosen((current) => {
                        const next = new Set(current);
                        if (on) next.add(id);
                        else next.delete(id);
                        return next;
                      })
                    }
                  />
                ) : (
                  <Text variant="bodyStrong">{label}</Text>
                )}
                <Text variant="secondary" tone="muted">{`Lý do gửi: ${text(item, 'reason')}`}</Text>
                {text(item, 'exceptionReason') ? (
                  <Text
                    variant="secondary"
                    tone="muted"
                  >{`Ngoại lệ: ${text(item, 'exceptionReason')}`}</Text>
                ) : null}
                {!pending ? (
                  <Badge
                    label={
                      REQUEST_STATUS[text(item, 'itemStatus')]?.label ?? text(item, 'itemStatus')
                    }
                    tone={REQUEST_STATUS[text(item, 'itemStatus')]?.tone ?? 'neutral'}
                  />
                ) : null}
              </View>
            );
          })}
          {flag(row, 'canDecide') ? (
            <TextField
              label="Ghi chú (bắt buộc khi từ chối)"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={500}
            />
          ) : null}
          {error ? <Banner tone="danger" message={error} /> : null}
        </>
      ) : null}
    </BottomSheet>
  );
}

function SendTab({ onSent }: { onSent: () => void }) {
  const gateway = useResourceGateway();
  const queryClient = useQueryClient();
  const [course, setCourse] = useState('');
  const [picked, setPicked] = useState<Map<string, CrossCandidate>>(new Map());
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const courses = useQuery({
    queryKey: [...KEY, 'courses'],
    queryFn: () => gateway.call<ResourceRow[]>('GET', `${BASE}/courses`),
  });
  const candidates = useQuery({
    queryKey: [...KEY, 'candidates', course],
    queryFn: () =>
      gateway.call<CrossCandidate[]>(
        'GET',
        `${BASE}/courses/${encodeURIComponent(course)}/candidates`,
      ),
    enabled: course !== '',
  });

  const options = (courses.data ?? []).map((item) => ({
    value: text(item, 'courseCode'),
    label: `${text(item, 'courseName')} — ${text(item, 'deaneryName')}`,
  }));
  const chosen = [...picked.values()];
  const setDraft = (id: string, patch: Partial<ItemDraft>) =>
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? EMPTY_DRAFT), ...patch } }));

  const submit = async () => {
    setError(null);
    const missing = missingReasons(chosen, drafts);
    if (missing.length)
      return setError(`Còn thiếu lý do cho: ${missing.map((c) => candidateName(c)).join(', ')}`);
    setSaving(true);
    try {
      await gateway.call('POST', `${BASE}/courses/${encodeURIComponent(course)}/requests`, {
        body: { items: buildItems(chosen, drafts) },
      });
      await queryClient.invalidateQueries({ queryKey: KEY });
      setPicked(new Map());
      setDrafts({});
      onSent();
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Text variant="secondary" tone="muted">
        Gửi huynh trưởng sang khóa của giáo hạt khác. Giáo hạt nhà đồng ý trước, rồi giáo hạt tổ
        chức khóa duyệt.
      </Text>
      {error ? <Banner tone="danger" message={error} /> : null}
      <SelectField
        label="Khóa của giáo hạt khác (đang mở đăng ký)"
        value={course}
        options={options}
        placeholder={courses.isPending ? 'Đang tải…' : 'Chọn khóa'}
        allowClear={false}
        onChange={(value) => {
          setCourse(value);
          setPicked(new Map());
          setDrafts({});
        }}
      />
      {candidates.isPending && course ? <LoadingState /> : null}
      {candidates.isError ? (
        <Banner tone="danger" message={errorMessage(candidates.error)} />
      ) : null}
      {(candidates.data ?? []).map((candidate) => {
        const blocked = candidate.blockedReason !== null;
        const on = picked.has(candidate.leaderId);
        const draft = drafts[candidate.leaderId] ?? EMPTY_DRAFT;
        return (
          <Card key={candidate.leaderId}>
            <View style={{ gap: 6 }}>
              <CheckboxRow
                label={`${candidateName(candidate)} — ${candidate.parishName ?? ''}${
                  candidate.eligible ? '' : ' (ngoại lệ)'
                }`}
                checked={on}
                onChange={(checked) => {
                  if (blocked) return;
                  setPicked((current) => {
                    const next = new Map(current);
                    if (checked) next.set(candidate.leaderId, candidate);
                    else next.delete(candidate.leaderId);
                    return next;
                  });
                }}
              />
              {blocked ? (
                <Text variant="secondary" tone="warning">
                  {candidate.blockedReason}
                </Text>
              ) : null}
              {on ? (
                <>
                  <TextField
                    label="Lý do gửi sang giáo hạt khác (bắt buộc)"
                    value={draft.reason}
                    onChangeText={(reason) => setDraft(candidate.leaderId, { reason })}
                    multiline
                    maxLength={500}
                  />
                  {!candidate.eligible ? (
                    <TextField
                      label="Lý do ngoại lệ (bắt buộc)"
                      value={draft.exceptionReason}
                      onChangeText={(exceptionReason) =>
                        setDraft(candidate.leaderId, { exceptionReason })
                      }
                      multiline
                      maxLength={500}
                    />
                  ) : null}
                  <TextField
                    label="Ghi chú"
                    value={draft.note}
                    onChangeText={(note) => setDraft(candidate.leaderId, { note })}
                    maxLength={1000}
                  />
                </>
              ) : null}
            </View>
          </Card>
        );
      })}
      {candidates.data && candidates.data.length === 0 ? (
        <EmptyState title="Không có huynh trưởng nào có thể gửi" />
      ) : null}
      <Button
        label={`Gửi yêu cầu (${chosen.length})`}
        loading={saving}
        disabled={chosen.length === 0}
        onPress={() => void submit()}
      />
    </>
  );
}

function InvitationsTab() {
  const gateway = useResourceGateway();
  const queryClient = useQueryClient();
  const [deciding, setDeciding] = useState<ResourceRow | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: [...KEY, 'invitations'],
    queryFn: () => gateway.call<ResourceRow[]>('GET', `${BASE}/course-invitations`),
  });

  const open = (row: ResourceRow) => {
    setDeciding(row);
    setNote('');
    setError(null);
  };
  const decide = async (allowed: boolean) => {
    if (!deciding) return;
    if (!allowed && note.trim() === '') return setError('Vui lòng nhập lý do từ chối');
    setBusy(true);
    setError(null);
    try {
      await gateway.call(
        'POST',
        `${BASE}/course-invitations/${encodeURIComponent(text(deciding, 'courseCode'))}/decision`,
        { body: { allowed, note: note.trim() || undefined } },
      );
      await queryClient.invalidateQueries({ queryKey: KEY });
      setDeciding(null);
    } catch (exception) {
      setError(errorMessage(exception));
    } finally {
      setBusy(false);
    }
  };
  const decisionLabel: Record<string, { label: string; tone: 'success' | 'danger' | 'warning' }> = {
    PENDING: { label: 'Chưa quyết định', tone: 'warning' },
    ALLOWED: { label: 'Cho phép gửi', tone: 'success' },
    DENIED: { label: 'Không cho phép', tone: 'danger' },
  };
  const info =
    deciding && typeof deciding.course === 'object' ? (deciding.course as ResourceRow) : null;

  return (
    <>
      <Text variant="secondary" tone="muted">
        Khóa của giáo hạt khác đang mở liên giáo hạt: quyết định có cho giáo xứ trong giáo hạt bạn
        gửi huynh trưởng sang hay không.
      </Text>
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <Banner tone="danger" message={errorMessage(query.error)} /> : null}
      {query.data && query.data.length === 0 ? <EmptyState title="Chưa có khóa nào mời" /> : null}
      {(query.data ?? []).map((row) => {
        const status = decisionLabel[text(row, 'decision')] ?? decisionLabel.PENDING!;
        return (
          <Card key={text(row, 'courseCode')} onPress={() => open(row)}>
            <View style={{ gap: 2 }}>
              <Text variant="bodyStrong">{text(row, 'courseName')}</Text>
              <Text variant="secondary" tone="textSecondary">
                {text(row, 'hostDeaneryName')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Badge label={status.label} tone={status.tone} />
                {flag(row, 'registrationClosed') ? (
                  <Badge label="Đã đóng đăng ký" tone="neutral" />
                ) : null}
              </View>
            </View>
          </Card>
        );
      })}

      <BottomSheet
        visible={deciding !== null}
        title={deciding ? text(deciding, 'courseName') : ''}
        onClose={() => setDeciding(null)}
        footer={
          deciding && flag(deciding, 'canDecide') ? (
            <>
              <Button
                label="Cho phép giáo xứ gửi"
                loading={busy}
                onPress={() => void decide(true)}
              />
              <Button
                label="Không cho phép"
                variant="destructive"
                disabled={busy}
                onPress={() => void decide(false)}
              />
            </>
          ) : undefined
        }
      >
        {deciding ? (
          <>
            <InfoRow label="Giáo hạt tổ chức" value={text(deciding, 'hostDeaneryName')} />
            {info ? (
              <>
                <InfoRow label="Loại khóa" value={text(info, 'courseTypeName')} />
                <InfoRow label="Địa điểm" value={text(info, 'location')} />
                <InfoRow
                  label="Thời gian"
                  value={[formatDate(text(info, 'startDate')), formatDate(text(info, 'endDate'))]
                    .filter(Boolean)
                    .join(' – ')}
                />
                <InfoRow
                  label="Đóng đăng ký"
                  value={formatDateTime(text(info, 'registrationEndAt'))}
                />
                {Array.isArray(info.requirements)
                  ? (info.requirements as string[]).map((line) => (
                      <Text key={line} variant="secondary" tone="muted">{`• ${line}`}</Text>
                    ))
                  : null}
              </>
            ) : null}
            {text(deciding, 'decisionNote') ? (
              <InfoRow label="Ghi chú đã lưu" value={text(deciding, 'decisionNote')} />
            ) : null}
            {flag(deciding, 'canDecide') ? (
              <TextField
                label="Ghi chú (bắt buộc khi từ chối)"
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={500}
              />
            ) : (
              <Text variant="secondary" tone="muted">
                Khóa đã đóng đăng ký nên không đổi được quyết định.
              </Text>
            )}
            {error ? <Banner tone="danger" message={error} /> : null}
          </>
        ) : null}
      </BottomSheet>
    </>
  );
}
