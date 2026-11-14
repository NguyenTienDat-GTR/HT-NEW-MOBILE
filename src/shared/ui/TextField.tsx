import { useState, type ComponentRef, type Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type TextInputProps,
} from 'react-native';

import { fontFamily } from '../theme/tokens';
import { useTheme } from '../theme/theme-provider';

import { EyeIcon, EyeSlashIcon, WarningCircleIcon } from './icons';
import { FieldLabel } from './FieldLabel';
import { Text } from './Text';

/** Kiểu tham chiếu tới ô nhập (để chuyển focus giữa các ô). */
export type TextInputHandle = ComponentRef<typeof TextInput>;

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  /** Lỗi hiển thị ngay dưới ô (kèm icon, không chỉ bằng màu). */
  error?: string;
  hint?: string;
  placeholder?: string;
  /** Ô mật khẩu: có nút hiện/ẩn. */
  secure?: boolean;
  leftIcon?: React.ReactNode;
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: ReturnKeyTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  maxLength?: number;
  editable?: boolean;
  /** Nhiều dòng (ghi chú, mô tả): ô cao hơn, Enter xuống dòng. */
  multiline?: boolean;
  onSubmitEditing?: () => void;
  inputRef?: Ref<TextInputHandle>;
}

export function TextField({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  hint,
  placeholder,
  secure = false,
  leftIcon,
  keyboardType,
  returnKeyType,
  autoCapitalize = 'none',
  autoComplete,
  textContentType,
  maxLength,
  editable = true,
  multiline = false,
  onSubmitEditing,
  inputRef,
}: TextFieldProps) {
  const theme = useTheme();
  const { colors } = theme;
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.input;

  return (
    <View style={styles.wrapper}>
      {/* Nhãn luôn hiện phía trên, không thay bằng placeholder. */}
      <FieldLabel label={label} hint={hint} />
      <View
        style={[
          styles.field,
          {
            minHeight: theme.touch.input,
            borderRadius: theme.radius.input,
            borderColor,
            backgroundColor: editable ? colors.surface1 : colors.surface2,
            // Vòng focus 3px như web (--primary-ring).
            borderWidth: focused ? 2 : 1,
          },
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secure && !revealed}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          maxLength={maxLength}
          editable={editable}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={label}
          accessibilityHint={hint}
          // 16px: iOS không tự phóng to khi focus.
          style={[
            styles.input,
            {
              color: colors.foreground,
              fontFamily: fontFamily.regular,
              minHeight: multiline ? 96 : theme.touch.input - 2,
            },
          ]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            onPress={() => setRevealed((value) => !value)}
            style={({ pressed }) => [
              styles.toggle,
              {
                backgroundColor: pressed ? colors.surface2 : 'transparent',
                borderRadius: theme.radius.input,
              },
            ]}
          >
            {revealed ? (
              <EyeSlashIcon size={theme.iconSize.md} color={colors.muted} />
            ) : (
              <EyeIcon size={theme.iconSize.md} color={colors.muted} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.message} accessibilityLiveRegion="polite">
          <WarningCircleIcon size={theme.iconSize.sm} color={colors.danger} weight="bold" />
          <Text variant="secondary" tone="danger" style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  field: { flexDirection: 'row', alignItems: 'center' },
  leftIcon: { paddingLeft: 14 },
  input: { flex: 1, fontSize: 16, paddingHorizontal: 14, paddingVertical: 10 },
  toggle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  messageText: { flex: 1 },
});
