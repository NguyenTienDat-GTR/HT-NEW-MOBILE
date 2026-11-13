import { formatNumber } from '@/core/domain/number-format';

import type { RecordCell, RecordDataset } from './entities';
import { keyLabel } from './labels';

export const DATASET_TITLES: Record<RecordDataset, string> = {
  leaders: 'Danh sách huynh trưởng',
  participations: 'Danh sách hồ sơ đăng ký khóa huấn luyện',
  certificates: 'Danh sách chứng nhận',
};

/** Nhãn cột bằng tiếng Việt (port từ FE record-format.ts). */
export const RECORD_COLUMN_LABELS: Record<string, string> = {
  id: 'Mã',
  code: 'Mã chứng nhận',
  name: 'Tên thánh và họ tên',
  leaderName: 'Tên thánh và họ tên',
  gender: 'Giới tính',
  birthDate: 'Ngày sinh',
  leaderLevel: 'Cấp bậc',
  parish: 'Giáo xứ / giáo họ / giáo điểm',
  deanery: 'Giáo hạt',
  active: 'Đang hoạt động',
  createdDate: 'Ngày tạo hồ sơ',
  courseName: 'Khóa huấn luyện',
  courseType: 'Loại khóa',
  issueDate: 'Ngày cấp',
  startDate: 'Ngày bắt đầu khóa',
  endDate: 'Ngày kết thúc khóa',
  registrationDate: 'Ngày đăng ký',
  approvalStatus: 'Trạng thái duyệt',
  systemSuggested: 'Hệ thống gợi ý',
  exceptionApproved: 'Duyệt ngoại lệ',
  participationStatus: 'Trạng thái tham dự',
  result: 'Kết quả',
  score: 'Điểm',
  certificateStatus: 'Trạng thái chứng nhận',
};

const DATE_COLUMNS = new Set([
  'birthDate',
  'createdDate',
  'issueDate',
  'startDate',
  'endDate',
  'registrationDate',
]);
const ENUM_COLUMNS = new Set([
  'gender',
  'approvalStatus',
  'participationStatus',
  'certificateStatus',
]);
const RESULT_LABELS: Record<string, string> = { COMPLETED: 'Đạt', UNCOMPLETED: 'Chưa đạt' };
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

export const columnLabel = (column: string): string => RECORD_COLUMN_LABELS[column] ?? column;

/** Giá trị hiển thị tiếng Việt của một ô: ngày dd/mm/yyyy, Có/Không, trạng thái và kết quả đã dịch. */
export function formatRecordValue(column: string, value: RecordCell | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'number' && /year$/i.test(column)) return String(value);
  if (typeof value === 'number') return formatNumber(value, 2);
  if (DATE_COLUMNS.has(column)) {
    const match = ISO_DATE.exec(value);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }
  if (column === 'result') return RESULT_LABELS[value] ?? value;
  if (ENUM_COLUMNS.has(column)) return keyLabel(value);
  return value;
}

/** Cột hiện trên thẻ (tiêu đề + 2 dòng phụ) theo từng loại danh sách; mọi cột còn lại nằm trong phần mở rộng. */
export const CARD_COLUMNS: Record<RecordDataset, { title: string[]; subtitle: string[] }> = {
  leaders: { title: ['name', 'leaderName'], subtitle: ['leaderLevel', 'parish'] },
  participations: {
    title: ['leaderName', 'name'],
    subtitle: ['courseName', 'participationStatus'],
  },
  certificates: { title: ['leaderName', 'name'], subtitle: ['courseName', 'approvalStatus'] },
};
