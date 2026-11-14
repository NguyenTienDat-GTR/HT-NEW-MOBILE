import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/core/domain/app-error';
import { formatDate } from '@/core/domain/date-format';
import { todayIso } from '@/shared/resource/form-logic';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConsentCheckbox } from '@/shared/ui/ConsentCheckbox';
import { DateField } from '@/shared/ui/DateField';
import { InfoRow } from '@/shared/ui/InfoRow';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Screen } from '@/shared/ui/Screen';
import { SelectField } from '@/shared/ui/SelectField';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { useToast } from '@/shared/ui/Toast';

import type { MyLeaderProfile } from '../../domain/entities';
import { genderLabel } from '../../domain/labels';
import {
  buildProfileChanges,
  draftFromLeader,
  hasProfileChanges,
  validateProfileDraft,
  type ProfileDraft,
} from '../../domain/profile-edit';
import { useAccountDependencies } from '../account-context';
import { MY_PROFILE_QUERY_KEY, useMyProfile } from '../use-account-queries';

const GENDERS = [
  { value: 'NAM', label: 'Nam' },
  { value: 'NU', label: 'Nữ' },
] as const;

export interface EditProfileScreenProps {
  onDone: () => void;
}

/**
 * Chỉnh sửa hồ sơ cá nhân (như edit-profile-dialog của web): cùng các trường với sửa hồ sơ huynh trưởng — tên thánh,
 * giới tính, email, số điện thoại. Họ và tên, giáo xứ, giáo hạt chỉ xem; ngày sinh chỉ sửa được khi tài khoản có quyền
 * sửa ngày sinh. Đổi email phải nhập mật khẩu hiện tại; luôn phải tích đồng ý xử lý dữ liệu cá nhân.
 */
export function EditProfileScreen({ onDone }: EditProfileScreenProps) {
  const query = useMyProfile();
  const profile = query.data;
  if (query.isPending)
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  if (query.isError || !profile?.leader)
    return (
      <Screen onRefresh={() => void query.refetch()}>
        <Banner
          tone={query.isError ? 'danger' : 'warning'}
          message={
            query.isError
              ? errorMessage(query.error)
              : 'Tài khoản này chưa được gắn với huynh trưởng nào nên không có hồ sơ cá nhân để sửa.'
          }
        />
      </Screen>
    );
  return (
    <EditProfileForm
      leader={profile.leader}
      canEditBirthDate={profile.canEditBirthDate}
      onDone={onDone}
    />
  );
}

function EditProfileForm({
  leader,
  canEditBirthDate,
  onDone,
}: {
  leader: MyLeaderProfile;
  canEditBirthDate: boolean;
  onDone: () => void;
}) {
  const deps = useAccountDependencies();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromLeader(leader));
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = useMemo(
    () => validateProfileDraft(draft, canEditBirthDate, todayIso()),
    [draft, canEditBirthDate],
  );
  const changes = buildProfileChanges(leader, draft, password, canEditBirthDate);
  const emailChanging = Boolean(changes.email);
  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const shown = (key: keyof ProfileDraft) => (showErrors ? errors[key] : undefined);

  const submit = async () => {
    setShowErrors(true);
    setError(null);
    if (Object.keys(errors).length > 0) return;
    if (!hasProfileChanges(changes)) {
      setError('Chưa có thay đổi nào để lưu.');
      return;
    }
    if (emailChanging && password === '') return;
    if (!consent) return;
    setPending(true);
    try {
      await deps.updateMyProfile.execute(changes);
      await queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY });
      // Tên / ảnh của huynh trưởng hiện ở danh sách huynh trưởng, chứng nhận, hồ sơ tham dự: làm mới các màn đó.
      await queryClient.invalidateQueries({ queryKey: ['resource'] });
      toast.success('Đã cập nhật hồ sơ cá nhân');
      onDone();
    } catch (exception) {
      setError(errorMessage(exception));
      toast.error(errorMessage(exception));
    } finally {
      setPending(false);
    }
  };

  return (
    <Screen
      footer={<Button label="Lưu cập nhật" onPress={() => void submit()} loading={pending} />}
    >
      <Text variant="secondary" tone="textSecondary">
        Họ và tên, giáo xứ và giáo hạt do quản trị viên quản lý nên không sửa ở đây.
        {canEditBirthDate ? '' : ' Ngày sinh chỉ sửa được khi tài khoản có quyền sửa ngày sinh.'}
      </Text>
      {error ? <Banner tone="danger" message={error} /> : null}

      <Card>
        <View style={{ gap: 12 }}>
          <InfoRow label="Họ và tên" value={leader.fullName} />
          <InfoRow label="Giáo xứ / giáo họ / giáo điểm" value={leader.parishName} />
          <InfoRow label="Giáo hạt" value={leader.deaneryName} />
          {canEditBirthDate ? null : (
            <InfoRow label="Ngày sinh" value={formatDate(leader.birthDate)} />
          )}
        </View>
      </Card>

      <TextField
        label="Tên thánh"
        required
        value={draft.holyName}
        onChangeText={(value) => set('holyName', value)}
        maxLength={50}
        autoCapitalize="words"
        error={shown('holyName')}
      />
      {canEditBirthDate ? (
        <DateField
          label="Ngày sinh"
          required
          value={draft.birthDate}
          onChange={(value) => set('birthDate', value)}
          maximumDate={todayIso()}
          error={shown('birthDate')}
        />
      ) : null}
      <SelectField
        label="Giới tính"
        required
        value={draft.gender}
        options={GENDERS}
        placeholder={draft.gender ? genderLabel(draft.gender) : 'Chọn'}
        allowClear={false}
        onChange={(value) => set('gender', value)}
        error={shown('gender')}
      />
      <TextField
        label="Email"
        required
        value={draft.email}
        onChangeText={(value) => set('email', value)}
        keyboardType="email-address"
        autoComplete="email"
        error={shown('email')}
      />
      <TextField
        label="Số điện thoại"
        required
        value={draft.phoneNumber}
        onChangeText={(value) => set('phoneNumber', value)}
        keyboardType="phone-pad"
        maxLength={10}
        error={shown('phoneNumber')}
      />
      {emailChanging ? (
        <TextField
          label="Mật khẩu hiện tại"
          required
          secure
          value={password}
          onChangeText={setPassword}
          autoComplete="current-password"
          hint="Đổi email cần nhập mật khẩu hiện tại để xác nhận bạn là chủ tài khoản."
          error={showErrors && password === '' ? 'Nhập mật khẩu hiện tại để đổi email' : undefined}
        />
      ) : null}
      <ConsentCheckbox
        variant="self"
        checked={consent}
        onChange={setConsent}
        error={showErrors && !consent ? 'Vui lòng xác nhận trước khi lưu' : undefined}
      />
    </Screen>
  );
}
