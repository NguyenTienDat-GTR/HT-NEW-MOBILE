import { useEffect, useState } from 'react';

/** Đếm ngược số giây còn lại tới mốc `targetMs` (epoch ms); trả 0 khi đã qua. */
export function useCountdown(targetMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetMs <= 0) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= targetMs) clearInterval(timer);
    };
    // Cập nhật ngay một lần (mốc mới) rồi mỗi giây; tự dừng khi hết giờ.
    const immediate = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(timer);
    };
  }, [targetMs]);

  return Math.max(0, Math.ceil((targetMs - now) / 1000));
}
