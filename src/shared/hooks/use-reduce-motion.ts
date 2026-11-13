import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Người dùng đã bật "giảm chuyển động" của hệ điều hành: tắt hiệu ứng không cần thiết (vd. sheet trượt lên). */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduce(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduce;
}
