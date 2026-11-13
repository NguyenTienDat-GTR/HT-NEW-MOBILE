import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

import { useLogout } from '../use-session';

/** Có phiên đã lưu nhưng không gọi được máy chủ: cho thử lại, không bắt đăng nhập lại ngay. */
export function SessionUnreachableScreen({ onRetry }: { onRetry: () => void }) {
  const logout = useLogout();
  return (
    <Screen
      footer={
        <>
          <Button label="Thử lại" onPress={onRetry} />
          <Button label="Đăng xuất" variant="ghost" size="sm" onPress={() => void logout()} />
        </>
      }
    >
      <Text variant="title">Không kết nối được</Text>
      <Banner
        tone="warning"
        message="Không kết nối được máy chủ. Kiểm tra mạng rồi bấm Thử lại. Phiên đăng nhập của bạn vẫn được giữ."
      />
    </Screen>
  );
}
