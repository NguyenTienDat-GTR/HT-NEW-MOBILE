import {
  certificateApprovalsResource,
  certificatesResource,
} from '@/features/certificates/presentation/certificates-resource';
import { courseTypesResource } from '@/features/training/presentation/course-types-resource';
import { coursesResource } from '@/features/training/presentation/courses-resource';
import {
  attendanceResource,
  crossDeaneryResource,
  teamsResource,
} from '@/features/training/presentation/course-tools-resources';
import {
  approvalsResource,
  participantsResource,
  registrationsResource,
  scoresResource,
} from '@/features/training/presentation/participations-resources';
import { accountRolesResource } from '@/features/system/presentation/account-roles-resource';
import { accountsResource } from '@/features/system/presentation/accounts-resource';
import { auditLogsResource } from '@/features/system/presentation/audit-logs-resource';
import { permissionsResource } from '@/features/system/presentation/permissions-resource';
import { rolesResource } from '@/features/system/presentation/roles-resource';
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
  courseTypesResource,
  coursesResource,
  registrationsResource,
  approvalsResource,
  participantsResource,
  scoresResource,
  teamsResource,
  attendanceResource,
  crossDeaneryResource,
  certificatesResource,
  certificateApprovalsResource,
  accountsResource,
  rolesResource,
  permissionsResource,
  accountRolesResource,
  auditLogsResource,
);

export function findResourceDefinition(id: string | undefined): ResourceDefinition | undefined {
  return DEFINITIONS.find((definition) => definition.id === id);
}

export function allResourceDefinitions(): readonly ResourceDefinition[] {
  return DEFINITIONS;
}
