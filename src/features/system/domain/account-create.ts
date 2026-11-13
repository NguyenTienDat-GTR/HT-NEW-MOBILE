import { hasRole, isSuperAdmin, type PermissionSubject } from '@/core/domain/permissions';

/** Tối đa 3 vai trò cho một tài khoản (như web). */
export const MAX_ACCOUNT_ROLES = 3;

const SYSTEM_ROLE_CODES = ['SUPER_ADMIN', 'ADMIN_DIOCESE', 'ADMIN_DEANERY', 'ADMIN_PARISH'];

/**
 * Hai kiểu tạo tài khoản như web: quản trị hệ thống cấp tài khoản cho vai trò toàn hệ thống (không gắn huynh trưởng,
 * nhận thông tin đăng nhập qua email); các quản trị khác cấp cho huynh trưởng chưa có tài khoản.
 */
export type AccountVariant = 'super' | 'leader';

export const accountVariant = (user: PermissionSubject | null): AccountVariant =>
  isSuperAdmin(user) ? 'super' : 'leader';

/**
 * Vai trò không được chọn khi tạo tài khoản. Quản trị hệ thống không cấp cho admin giáo hạt / giáo xứ (do cấp dưới cấp);
 * admin giáo phận không cấp vai trò ngang hoặc cao hơn mình; tương tự cấp giáo hạt.
 */
export function excludedRoleCodes(user: PermissionSubject | null): string[] {
  if (isSuperAdmin(user)) return ['ADMIN_DEANERY', 'ADMIN_PARISH'];
  if (hasRole(user, 'ADMIN_DIOCESE')) return ['SUPER_ADMIN', 'ADMIN_DIOCESE'];
  if (hasRole(user, 'ADMIN_DEANERY')) return ['SUPER_ADMIN', 'ADMIN_DIOCESE', 'ADMIN_DEANERY'];
  return SYSTEM_ROLE_CODES;
}

export interface RoleChoice {
  codes: string[];
  primary: string;
}

export const EMPTY_ROLE_CHOICE: RoleChoice = { codes: [], primary: '' };

/** Lựa chọn vai trò lưu trong ô nhập dạng chuỗi JSON. */
export function parseRoleChoice(value: string): RoleChoice {
  try {
    const data = JSON.parse(value) as Partial<RoleChoice>;
    const codes = Array.isArray(data.codes) ? data.codes.map(String) : [];
    return { codes, primary: codes.includes(String(data.primary)) ? String(data.primary) : '' };
  } catch {
    return EMPTY_ROLE_CHOICE;
  }
}

export const stringifyRoleChoice = (choice: RoleChoice) => JSON.stringify(choice);

/** Chọn/bỏ một vai trò. Quá 3 vai trò thì giữ nguyên; bỏ vai trò chính thì vai trò đầu tiên còn lại thành chính. */
export function toggleRole(choice: RoleChoice, code: string): RoleChoice {
  if (choice.codes.includes(code)) {
    const codes = choice.codes.filter((item) => item !== code);
    return { codes, primary: choice.primary === code ? (codes[0] ?? '') : choice.primary };
  }
  if (choice.codes.length >= MAX_ACCOUNT_ROLES) return choice;
  const codes = [...choice.codes, code];
  return { codes, primary: choice.primary || code };
}

export function setPrimaryRole(choice: RoleChoice, code: string): RoleChoice {
  return choice.codes.includes(code) ? { ...choice, primary: code } : choice;
}

type Values = Record<string, string | boolean>;
const str = (values: Values, key: string) => String(values[key] ?? '').trim();

/** Thân tạo tài khoản (POST /system/accounts). */
export function buildAccountBody(values: Values, variant: AccountVariant) {
  if (variant === 'super') {
    const roleCode = str(values, 'roleCode');
    return {
      roleCode,
      dioceseId: roleCode === 'ADMIN_DIOCESE' ? str(values, 'dioceseId') : undefined,
      credentialEmail: str(values, 'credentialEmail'),
      subjectConsentConfirmed: true,
    };
  }
  const choice = parseRoleChoice(str(values, 'roles'));
  return {
    leaderId: str(values, 'leaderId'),
    roleCodes: choice.codes,
    primaryRoleCode: choice.primary || choice.codes[0],
    subjectConsentConfirmed: true,
  };
}
