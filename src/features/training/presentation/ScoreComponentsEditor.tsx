import { View } from 'react-native';

import type { CustomFieldProps } from '@/shared/resource/types';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SwitchRow } from '@/shared/ui/SwitchRow';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import {
  DEFAULT_SCORE_COMPONENT,
  maxFinalScore,
  parseScoreComponents,
  stringifyScoreComponents,
  type ScoreComponentDraft,
} from '../domain/score-components';

/**
 * Nhập các thành phần điểm của khóa (tên, điểm tối đa, hệ số, có tính vào tổng kết không). Mỗi thành phần là một thẻ
 * xếp dọc. Khóa đã có điểm nhập thì chỉ đổi được tên: không thêm/xóa, không đổi số liệu.
 */
export function ScoreComponentsEditor({ value, onChange, locked }: CustomFieldProps) {
  const rows = parseScoreComponents(value);
  const structureLocked = locked || rows.some((row) => row.hasScores === true);
  const update = (index: number, patch: Partial<ScoreComponentDraft>) =>
    onChange(
      stringifyScoreComponents(rows.map((row, i) => (i === index ? { ...row, ...patch } : row))),
    );
  const max = maxFinalScore(rows);

  return (
    <View style={{ gap: 12 }}>
      <Text variant="label">Thành phần điểm của khóa</Text>
      <Text variant="secondary" tone="muted">
        Điểm tổng kết = Σ(điểm × hệ số) / Σ hệ số của các thành phần được tính.
        {max !== null ? ` Điểm tổng kết tối đa: ${max}.` : ''}
      </Text>
      {rows.map((row, index) => (
        <Card key={row.id ?? `new-${index}`}>
          <View style={{ gap: 8 }}>
            <TextField
              label={`Thành phần ${index + 1}: tên`}
              value={row.name}
              onChangeText={(name) => update(index, { name })}
              maxLength={255}
              editable={!locked}
            />
            <TextField
              label="Điểm tối đa"
              value={row.maxScore}
              onChangeText={(maxScore) => update(index, { maxScore })}
              keyboardType="decimal-pad"
              editable={!structureLocked}
            />
            <TextField
              label="Hệ số"
              value={row.coefficient}
              onChangeText={(coefficient) => update(index, { coefficient })}
              keyboardType="decimal-pad"
              editable={!structureLocked}
            />
            <SwitchRow
              label="Tính vào điểm tổng kết"
              value={row.includeInFinal}
              disabled={structureLocked}
              onChange={(includeInFinal) => update(index, { includeInFinal })}
            />
            {!structureLocked && rows.length > 1 ? (
              <Button
                label="Xóa thành phần này"
                variant="outline"
                size="sm"
                onPress={() =>
                  onChange(stringifyScoreComponents(rows.filter((_, i) => i !== index)))
                }
              />
            ) : null}
          </View>
        </Card>
      ))}
      {!structureLocked ? (
        <Button
          label="Thêm thành phần điểm"
          variant="outline"
          onPress={() =>
            onChange(stringifyScoreComponents([...rows, { ...DEFAULT_SCORE_COMPONENT }]))
          }
        />
      ) : (
        <Text variant="secondary" tone="muted">
          Khóa đã có điểm được nhập nên chỉ đổi được tên thành phần.
        </Text>
      )}
    </View>
  );
}
