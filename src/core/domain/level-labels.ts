/** Tên mặc định của các cấp (mỗi giáo phận có danh mục riêng; tên thật tra từ /leader-levels/options). */
const DEFAULT_LEVEL_NAMES: Record<string, string> = {
  NONE: 'Chưa có cấp',
  HT_XU: 'Huynh trưởng xứ',
  DU_TRUONG: 'Dự trưởng',
  HT_I: 'Huynh trưởng cấp I',
  HT_II: 'Huynh trưởng cấp II',
  HT_III: 'Huynh trưởng cấp III',
  HLV_I: 'Huấn luyện viên cấp I',
  HLV_II: 'Huấn luyện viên cấp II',
  HLV_III: 'Huấn luyện viên cấp III',
};

export function levelLabel(code: string | null | undefined, names?: ReadonlyMap<string, string>) {
  if (!code) return '';
  return names?.get(code) ?? DEFAULT_LEVEL_NAMES[code] ?? code;
}
