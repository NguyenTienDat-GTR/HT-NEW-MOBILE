import { managementLevelBadge } from './training-labels';

describe('managementLevelBadge', () => {
  it('giáo phận tím, giáo hạt xanh trời, cấp khác không có nhãn', () => {
    expect(managementLevelBadge('DIOCESE')).toEqual({ label: 'Giáo phận', tone: 'violet' });
    expect(managementLevelBadge('DEANERY')).toEqual({ label: 'Giáo hạt', tone: 'sky' });
    expect(managementLevelBadge('PARISH')).toBeNull();
    expect(managementLevelBadge(undefined)).toBeNull();
  });
});
