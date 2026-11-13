import { View } from 'react-native';

import { Button } from '@/shared/ui/Button';
import { CheckboxRow } from '@/shared/ui/CheckboxRow';
import { Text } from '@/shared/ui/Text';

import {
  MAX_ACCOUNT_ROLES,
  setPrimaryRole,
  toggleRole,
  type RoleChoice,
} from '../domain/account-create';

export interface RoleOption {
  value: string;
  label: string;
  /** Đã gán từ trước: hiện đã tích và không đổi được. */
  assigned?: boolean;
}

/**
 * Danh sách vai trò để tích chọn (tối đa 3). `showPrimary`: vai trò đã tích có nút chọn làm vai trò chính.
 * Dùng cho tạo tài khoản (có vai trò chính) và gán thêm vai trò cho tài khoản (không có).
 */
export function RoleChecklist({
  options,
  choice,
  onChange,
  showPrimary,
  maxNew = MAX_ACCOUNT_ROLES,
  loading,
  emptyText = 'Không có vai trò nào để chọn.',
}: {
  options: readonly RoleOption[];
  choice: RoleChoice;
  onChange: (choice: RoleChoice) => void;
  showPrimary: boolean;
  /** Số vai trò mới được tích tối đa (đã trừ các vai trò đã gán). */
  maxNew?: number;
  loading?: boolean;
  emptyText?: string;
}) {
  if (loading)
    return (
      <Text variant="secondary" tone="muted">
        Đang tải danh sách vai trò…
      </Text>
    );
  if (options.length === 0)
    return (
      <Text variant="secondary" tone="muted">
        {emptyText}
      </Text>
    );
  const atLimit = choice.codes.length >= maxNew;
  return (
    <View style={{ gap: 4 }}>
      {options.map((option) => {
        const checked = option.assigned === true || choice.codes.includes(option.value);
        const blocked = option.assigned === true || (!checked && atLimit);
        return (
          <View key={option.value}>
            <CheckboxRow
              label={option.assigned ? `${option.label} (đã gán)` : option.label}
              checked={checked}
              onChange={() => {
                if (!blocked) onChange(toggleRoleLimited(choice, option.value, maxNew));
              }}
            />
            {showPrimary && choice.codes.includes(option.value) ? (
              <View style={{ paddingLeft: 40, paddingBottom: 4 }}>
                <Button
                  label={
                    choice.primary === option.value ? 'Vai trò chính' : 'Đặt làm vai trò chính'
                  }
                  variant={choice.primary === option.value ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => onChange(setPrimaryRole(choice, option.value))}
                />
              </View>
            ) : null}
          </View>
        );
      })}
      {atLimit ? (
        <Text variant="secondary" tone="muted">
          {`Mỗi tài khoản tối đa ${MAX_ACCOUNT_ROLES} vai trò.`}
        </Text>
      ) : null}
    </View>
  );
}

/** Như toggleRole nhưng theo giới hạn số vai trò mới (khi đã có vai trò gán từ trước). */
function toggleRoleLimited(choice: RoleChoice, code: string, max: number): RoleChoice {
  if (!choice.codes.includes(code) && choice.codes.length >= max) return choice;
  return toggleRole(choice, code);
}
