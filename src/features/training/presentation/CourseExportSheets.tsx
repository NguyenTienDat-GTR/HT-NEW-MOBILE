import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { errorMessage } from '@/core/domain/app-error';
import { pollJob } from '@/core/jobs/poll-job';
import type { PermissionSubject } from '@/core/domain/permissions';
import { safeFileName, shareDownloadedFile } from '@/shared/files/share-file';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { Banner } from '@/shared/ui/Banner';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { SelectField } from '@/shared/ui/SelectField';
import { SwitchRow } from '@/shared/ui/SwitchRow';
import { Text } from '@/shared/ui/Text';
import { useToast } from '@/shared/ui/Toast';

import {
  GROUP_LABELS,
  LAYOUT_LABELS,
  badgeConfigLabel,
  badgeExportBody,
  exportLevelOf,
  templateExportQuery,
  templateGroupOptions,
  type FlipEdge,
  type TemplateGroupBy,
  type TemplateLayout,
  type UsableBadgeConfig,
} from '../domain/course-export';

type Kind = 'badges' | 'certificates' | 'registrations';

interface PdfJob {
  jobId: string;
  status: string;
  filename?: string | null;
  badgeCount?: number | null;
  pageCount?: number | null;
  error?: string | null;
}

interface ExcelJob {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  fileName?: string | null;
  errorMessage?: string | null;
  downloadable?: boolean;
}

const FLIP_OPTIONS = [
  { value: 'LONG', label: 'Lật theo cạnh dài (mặc định của máy in)' },
  { value: 'SHORT', label: 'Lật theo cạnh ngắn' },
] as const;

const enc = encodeURIComponent;

/**
 * Xuất file từ một khóa ngay trên app, rồi mở hộp chia sẻ của hệ điều hành (lưu, gửi Zalo/mail, in…): thẻ tham dự
 * (PDF), chứng nhận đã duyệt của khóa (PDF) và danh sách đăng ký theo mẫu Excel của đơn vị tổ chức khóa. Cả ba chạy nền ở
 * BE: app tạo tác vụ, chờ xong rồi tải về (như web).
 */
export function CourseExportSheet({
  kind,
  courseCode,
  subject,
  visible,
  onClose,
}: {
  kind: Kind | null;
  courseCode: string;
  subject: PermissionSubject | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (kind === 'badges')
    return <BadgeSheet courseCode={courseCode} visible={visible} onClose={onClose} />;
  if (kind === 'certificates')
    return <CertificatesSheet courseCode={courseCode} visible={visible} onClose={onClose} />;
  if (kind === 'registrations')
    return (
      <RegistrationsSheet
        courseCode={courseCode}
        subject={subject}
        visible={visible}
        onClose={onClose}
      />
    );
  return null;
}

/** Chạy một lần xuất: báo tiến độ, tải file, mở hộp chia sẻ; lỗi hiện ở banner và toast. */
function useRunExport(onDone: () => void) {
  const toast = useToast();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<string>) => {
    setRunning(true);
    setError(null);
    try {
      toast.success(await action());
      onDone();
    } catch (exception) {
      const message = errorMessage(exception);
      setError(message);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };
  return { running, error, setError, run };
}

async function shareOrFail(
  file: Awaited<ReturnType<ReturnType<typeof useResourceGateway>['download']>>,
  name: string,
  extension: string,
  title: string,
) {
  const shared = await shareDownloadedFile(file, safeFileName(name, extension), title);
  if (!shared) throw new Error('Thiết bị này không hỗ trợ chia sẻ tệp.');
}

function BadgeSheet({
  courseCode,
  visible,
  onClose,
}: {
  courseCode: string;
  visible: boolean;
  onClose: () => void;
}) {
  const gateway = useResourceGateway();
  const [configId, setConfigId] = useState('');
  const [team, setTeam] = useState('');
  const [includeBack, setIncludeBack] = useState(true);
  const [flipEdge, setFlipEdge] = useState<FlipEdge>('LONG');
  const { running, error, run } = useRunExport(onClose);
  const base = `/training/courses/${enc(courseCode)}`;

  const configsQuery = useQuery({
    queryKey: ['course-badge-configs', courseCode],
    enabled: visible,
    queryFn: () => gateway.call<UsableBadgeConfig[]>('GET', `${base}/badges/configs`),
  });
  const teamsQuery = useQuery({
    queryKey: ['course-team-options', courseCode],
    enabled: visible,
    queryFn: () => gateway.call<{ teamName: string }[]>('GET', `${base}/teams/options`),
  });
  const configs = configsQuery.data ?? [];
  const applied = configs.find((config) => config.applied) ?? null;
  const active = configs.find((config) => config.id === configId) ?? applied;
  const noConfig = configsQuery.isSuccess && configs.length === 0;

  const submit = () =>
    run(async () => {
      const first = await gateway.call<PdfJob>('POST', `${base}/badges/export/jobs`, {
        body: badgeExportBody({
          configId: configId || undefined,
          teamName: team || undefined,
          includeBack: Boolean(active?.hasBack) && includeBack,
          flipEdge,
        }),
      });
      const done = await pollJob(
        first,
        (current) =>
          gateway.call<PdfJob>('GET', `${base}/badges/export/jobs/${enc(current.jobId)}`),
        (job) => job.status === 'DONE' || job.status === 'FAILED',
      );
      if (done.status !== 'DONE') throw new Error(done.error || 'Không thể tạo PDF thẻ tham dự');
      const file = await gateway.download(
        'GET',
        `${base}/badges/export/jobs/${enc(done.jobId)}/file`,
      );
      await shareOrFail(file, done.filename ?? `the-tham-du-${courseCode}`, 'pdf', 'Thẻ tham dự');
      return `Đã xuất ${done.badgeCount ?? 0} thẻ (${done.pageCount ?? 0} trang)`;
    });

  return (
    <BottomSheet
      visible={visible}
      title="Xuất thẻ tham dự"
      onClose={onClose}
      footer={
        <>
          <Button
            label="Xuất PDF"
            loading={running}
            disabled={!active}
            onPress={() => void submit()}
          />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <Text variant="secondary" tone="muted">
        Tạo file PDF thẻ cho các hồ sơ trong danh sách tham dự; mỗi trang giấy xếp nhiều thẻ theo
        khổ thẻ của cấu hình.
      </Text>
      {noConfig ? (
        <Banner
          tone="warning"
          message="Chưa có cấu hình thẻ tham dự nào dùng được cho khóa này. Hãy tạo cấu hình ở menu Huấn luyện → Cấu hình thẻ tham dự trên web."
        />
      ) : null}
      {configsQuery.isError ? (
        <Banner tone="danger" message="Không tải được danh sách cấu hình thẻ. Hãy thử lại." />
      ) : null}
      <SelectField
        label="Cấu hình thẻ"
        value={configId}
        placeholder={applied ? `Cấu hình chung: ${applied.name}` : 'Chưa có cấu hình chung'}
        options={configs
          .filter((config) => config.id !== applied?.id)
          .map((config) => ({ value: config.id, label: badgeConfigLabel(config) }))}
        disabled={configs.length === 0}
        onChange={setConfigId}
      />
      <SelectField
        label="Đội"
        hint="Chỉ xuất thẻ của một đội. Bỏ trống để xuất tất cả hồ sơ."
        value={team}
        placeholder="Tất cả hồ sơ"
        options={(teamsQuery.data ?? []).map((item) => ({
          value: item.teamName,
          label: item.teamName,
        }))}
        onChange={setTeam}
      />
      {active?.hasBack ? (
        <>
          <SwitchRow
            label="Xuất cả mặt sau (in hai mặt)"
            value={includeBack}
            onChange={setIncludeBack}
          />
          {includeBack ? (
            <SelectField
              label="Cạnh lật khi in hai mặt"
              hint="Chọn đúng với cài đặt in hai mặt của máy in để mặt sau khớp mặt trước."
              value={flipEdge}
              options={FLIP_OPTIONS}
              allowClear={false}
              onChange={(value) => setFlipEdge(value as FlipEdge)}
            />
          ) : null}
        </>
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}

function CertificatesSheet({
  courseCode,
  visible,
  onClose,
}: {
  courseCode: string;
  visible: boolean;
  onClose: () => void;
}) {
  const gateway = useResourceGateway();
  const { running, error, run } = useRunExport(onClose);

  const submit = () =>
    run(async () => {
      // Danh sách mã rỗng kèm mã khóa: máy chủ xuất mọi chứng nhận đã duyệt của khóa.
      const first = await gateway.call<PdfJob>('POST', '/certificates/export-pdf/jobs', {
        body: { certificateCodes: [], courseCode },
      });
      const done = await pollJob(
        first,
        async (current) => ({
          ...current,
          ...(await gateway.call<Partial<PdfJob>>(
            'GET',
            `/certificates/export-pdf/jobs/${enc(current.jobId)}`,
          )),
        }),
        (job) => job.status === 'DONE' || job.status === 'FAILED',
      );
      if (done.status !== 'DONE') throw new Error(done.error || 'Không thể tạo PDF chứng nhận');
      const file = await gateway.download(
        'GET',
        `/certificates/export-pdf/jobs/${enc(done.jobId)}/file`,
      );
      await shareOrFail(file, `chung-nhan-${courseCode}`, 'pdf', 'Chứng nhận của khóa');
      return 'Đã xuất PDF các chứng nhận đã duyệt của khóa';
    });

  return (
    <BottomSheet
      visible={visible}
      title="Xuất PDF chứng nhận"
      onClose={onClose}
      footer={
        <>
          <Button label="Xuất PDF" loading={running} onPress={() => void submit()} />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <Text variant="body" tone="textSecondary">
        Xuất một file PDF gồm mọi chứng nhận đã duyệt của khóa này. Chứng nhận chưa duyệt, bị từ
        chối hoặc đã thu hồi không có trong file. Khóa nhiều chứng nhận có thể mất vài phút.
      </Text>
      {error ? <Banner tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}

function RegistrationsSheet({
  courseCode,
  subject,
  visible,
  onClose,
}: {
  courseCode: string;
  subject: PermissionSubject | null;
  visible: boolean;
  onClose: () => void;
}) {
  const gateway = useResourceGateway();
  const options = templateGroupOptions(exportLevelOf(subject));
  const [groupBy, setGroupBy] = useState<TemplateGroupBy>('PARISH');
  const [layout, setLayout] = useState<TemplateLayout>('SHEET_PER_GROUP');
  const { running, error, run } = useRunExport(onClose);
  const effective: TemplateGroupBy =
    options.length === 0 ? 'NONE' : options.includes(groupBy) ? groupBy : 'PARISH';

  const submit = () =>
    run(async () => {
      const first = await gateway.call<ExcelJob>(
        'POST',
        '/training/participations/template-export',
        {
          query: templateExportQuery(courseCode, groupBy, layout, options),
        },
      );
      const done = await pollJob(
        first,
        (current) => gateway.call<ExcelJob>('GET', `/excel-jobs/${enc(current.id)}`),
        (job) => ['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(job.status),
      );
      if (done.status !== 'SUCCEEDED')
        throw new Error(done.errorMessage || 'Không thể xuất danh sách đăng ký theo mẫu');
      const file = await gateway.download('GET', `/excel-jobs/${enc(done.id)}/file`);
      await shareOrFail(
        file,
        done.fileName ?? `dang-ky-tham-du-${courseCode}`,
        'xlsx',
        'Danh sách đăng ký',
      );
      return 'Đã xuất danh sách đăng ký theo mẫu';
    });

  return (
    <BottomSheet
      visible={visible}
      title="Xuất Excel theo mẫu"
      onClose={onClose}
      footer={
        <>
          <Button label="Xuất Excel" loading={running} onPress={() => void submit()} />
          <Button label="Hủy" variant="ghost" size="sm" onPress={onClose} />
        </>
      }
    >
      <Text variant="secondary" tone="muted">
        Điền danh sách đăng ký của khóa vào mẫu Excel của đơn vị tổ chức khóa (giáo hạt hoặc giáo
        phận). Mẫu soạn ở menu Huấn luyện → Mẫu danh sách đăng ký trên web.
      </Text>
      {options.length > 0 ? (
        <>
          <SelectField
            label="Gom danh sách"
            value={effective}
            options={options.map((value) => ({ value, label: GROUP_LABELS[value] }))}
            allowClear={false}
            onChange={(value) => setGroupBy(value as TemplateGroupBy)}
          />
          {effective !== 'NONE' ? (
            <SelectField
              label="Cách xuất"
              value={layout}
              options={(['SHEET_PER_GROUP', 'SINGLE_SHEET', 'FILE_PER_GROUP'] as const).map(
                (value) => ({ value, label: LAYOUT_LABELS[value] }),
              )}
              allowClear={false}
              onChange={(value) => setLayout(value as TemplateLayout)}
            />
          ) : null}
        </>
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}
    </BottomSheet>
  );
}
