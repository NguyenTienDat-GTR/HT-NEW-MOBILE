import { useQueryClient } from '@tanstack/react-query';
import { useState, useSyncExternalStore } from 'react';

import { errorMessage } from '@/core/domain/app-error';
import { useResourceGateway } from '@/shared/resource/resource-context';
import { useToast } from '@/shared/ui/Toast';

import { FeePaymentQueue } from '../domain/fee-payment-queue';

interface FeeResultDto {
  feePaid: boolean;
  feePaidAt?: string | null;
}

/**
 * Hàng đợi tự lưu đóng lệ phí gắn với React Query: thành công không báo gì, lưu hỏng thì trả ô về như cũ và báo lỗi tiếng
 * Việt kèm tên người. Khi hàng đợi rỗng một lúc, chỉ làm mới dữ liệu điểm danh của các khóa vừa thay đổi (một lần cho cả
 * loạt). Dùng chung quy tắc với web (xem domain/fee-payment-queue).
 *
 * keepOptimistic: nơi dùng giữ kết quả tra cứu riêng (màn quét giữ người vừa quét) không được tải lại cùng danh sách, nên
 * không được dọn trạng thái vừa lưu khi rảnh, nếu không ô sẽ quay về trạng thái cũ của kết quả tra cứu.
 */
export function useFeePayments({ keepOptimistic = false }: { keepOptimistic?: boolean } = {}) {
  const gateway = useResourceGateway();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [queue] = useState(() => {
    const created: FeePaymentQueue = new FeePaymentQueue({
      save: async (id, paid, context) => {
        const result = await gateway.call<FeeResultDto>(
          'PUT',
          `/training/courses/${encodeURIComponent(context)}/attendance/participants/${encodeURIComponent(id)}/fee`,
          { body: { paid } },
        );
        return { paid: result.feePaid, paidAt: result.feePaidAt ?? null };
      },
      onError: ({ label, error }) => {
        toast.error(`Không lưu được lệ phí của ${label}: ${errorMessage(error)}`);
      },
      onIdle: (contexts) => {
        const startedAt = Date.now();
        void Promise.all(
          contexts.map((code) =>
            queryClient.invalidateQueries({ queryKey: ['course-attendance', code] }),
          ),
        ).then(() => {
          if (!keepOptimistic) created.release(startedAt);
        });
      },
    });
    return created;
  });

  // Đổi trạng thái hàng đợi thì vẽ lại.
  useSyncExternalStore(queue.subscribe, queue.getVersion, queue.getVersion);

  return queue;
}
