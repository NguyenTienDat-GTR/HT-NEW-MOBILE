import type { ResourceGateway } from '@/core/resource/resource-gateway';

import type { PickedImage } from '../ui/AvatarPickerSheet';

/** Kết quả tải ảnh lên (POST /media): ảnh ở trạng thái "chờ gắn" cho tới khi được lưu cùng bản ghi. */
export interface MediaUploadResult {
  assetId: string;
  /** URL đã ký (có hạn) của ảnh hiển thị và ảnh nhỏ; dạng `/api/media/...`. */
  url: string;
  thumbUrl: string;
}

/** Tải ảnh đại diện huynh trưởng (loại LEADER_AVATAR) lên kho ảnh của BE. */
export function uploadLeaderAvatar(
  gateway: ResourceGateway,
  file: PickedImage,
): Promise<MediaUploadResult> {
  const body = new FormData();
  // React Native nhận tệp cục bộ dạng { uri, name, type }.
  body.append('file', file as unknown as Blob);
  body.append('category', 'LEADER_AVATAR');
  return gateway.call<MediaUploadResult>('POST', '/media', { body });
}
