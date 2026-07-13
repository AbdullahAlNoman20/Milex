// src/modules/reports-export/reportsExport.service.ts
import { v4 as uuidv4 } from 'uuid';
import { runExportJob } from '../../jobs/export-report.job';
import { logAudit } from '../../common/utils/auditLog.util';

export const requestExport = async (
  reportType: string,
  filters: Record<string, unknown>,
  actorId: string
) => {
  const jobId = uuidv4();
  const result = await runExportJob(reportType, filters);
  await logAudit({ entity: 'Report', entityId: jobId, action: 'EXPORT_REQUESTED', actorId, afterState: { reportType, filters } });
  return { jobId, result };
};