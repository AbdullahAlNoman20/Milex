// src/modules/reports-export/reportsExport.service.ts
import crypto from 'crypto';
import { runExportJob, ExportFilters } from '../../jobs/export-report.job';
import { logAudit } from '../../common/utils/auditLog.util';

export const requestExport = async (
  reportType: string,
  filters: ExportFilters,
  requester: { id: string; role: string }
) => {
  const jobId = crypto.randomUUID();
  const result = await runExportJob(reportType, filters, requester);
  await logAudit({
    entity: 'Report',
    entityId: jobId,
    action: 'EXPORT_REQUESTED',
    actorId: requester.id,
    afterState: { reportType, filters, rowCount: Array.isArray(result) ? result.length : 0 },
  });
  return { jobId, rowCount: Array.isArray(result) ? result.length : 0, result };
};