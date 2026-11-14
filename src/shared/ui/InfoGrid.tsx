import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { InfoRow } from './InfoRow';

/** Giá trị ngắn (ngày, số, trạng thái, tên ngắn) xếp hai cột; giá trị dài hoặc có nội dung riêng chiếm cả dòng. */
const SHORT_LIMIT = 24;

type InfoRowElement = ReactElement<{ label: string; value?: string | null; children?: ReactNode }>;

function isShortInfoRow(node: ReactNode): node is InfoRowElement {
  if (!isValidElement(node) || node.type !== InfoRow) return false;
  const props = (node as InfoRowElement).props;
  if (props.children) return false;
  const value = props.value ?? '';
  return props.label.length <= SHORT_LIMIT && value.length <= SHORT_LIMIT && !value.includes('\n');
}

/**
 * Khung các dòng thông tin gọn: các `InfoRow` liền nhau có giá trị ngắn được xếp cặp hai cột (không để một ngày hay
 * một con số chiếm hết chiều rộng); tiêu đề, giá trị dài, nút và mọi phần tử khác vẫn chiếm cả dòng.
 */
export function InfoGrid({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  const rows: ReactNode[][] = [];
  let pending: ReactNode | null = null;
  const flush = () => {
    if (pending !== null) rows.push([pending]);
    pending = null;
  };
  Children.toArray(children).forEach((node) => {
    if (isShortInfoRow(node)) {
      if (pending === null) {
        pending = node;
      } else {
        rows.push([pending, node]);
        pending = null;
      }
      return;
    }
    flush();
    rows.push([node]);
  });
  flush();

  return (
    <View style={{ gap }}>
      {rows.map((row, index) =>
        row.length === 2 || (row.length === 1 && isShortInfoRow(row[0])) ? (
          <View key={index} style={[styles.pair, { gap }]}>
            <View style={styles.cell}>{row[0]}</View>
            <View style={styles.cell}>{row[1] ?? null}</View>
          </View>
        ) : (
          <View key={index}>{row[0]}</View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row' },
  cell: { flex: 1 },
});
