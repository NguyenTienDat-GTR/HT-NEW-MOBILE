import { assignmentsResource } from '@/features/executive-board/presentation/assignments-resource';
import { positionsResource } from '@/features/executive-board/presentation/positions-resource';
import { leaderLevelsResource } from '@/features/leaders/presentation/leader-levels-resource';
import { leadersResource } from '@/features/leaders/presentation/leaders-resource';
import { deaneriesResource } from '@/features/organization/presentation/resources/deaneries';
import { diocesesResource } from '@/features/organization/presentation/resources/dioceses';
import { parishesResource } from '@/features/organization/presentation/resources/parishes';
import type { ResourceDefinition } from '@/shared/resource/types';

/**
 * Sổ đăng ký các tài nguyên CRUD chạy theo cấu hình. Thêm một màn danh sách/chi tiết/form mới = thêm một định nghĩa
 * vào mảng này (và một dòng menu); các màn hình tổng quát không phải sửa.
 */
const DEFINITIONS: ResourceDefinition[] = [];

export function registerResources(...definitions: ResourceDefinition[]): void {
  for (const definition of definitions) {
    if (!DEFINITIONS.some((existing) => existing.id === definition.id))
      DEFINITIONS.push(definition);
  }
}

registerResources(
  diocesesResource,
  deaneriesResource,
  parishesResource,
  leadersResource,
  leaderLevelsResource,
  positionsResource,
  assignmentsResource,
);

export function findResourceDefinition(id: string | undefined): ResourceDefinition | undefined {
  return DEFINITIONS.find((definition) => definition.id === id);
}

export function allResourceDefinitions(): readonly ResourceDefinition[] {
  return DEFINITIONS;
}
