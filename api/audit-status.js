import { getAuditStatus, setAuditStatus } from './utils/auditStatusStore.js';

export default async function handler(req, res) {
  console.log(`[AUDIT-STATUS] ${req.method} request received`);

  if (req.method === 'GET') {
    // Get status endpoint
    const { auditId } = req.query;
    console.log(`[AUDIT-STATUS] GET request for auditId: ${auditId}`);

    if (!auditId) {
      return res.status(400).json({ error: 'auditId required' });
    }

    const status = getAuditStatus(auditId);
    console.log(`[AUDIT-STATUS] Returning status for ${auditId}:`, status);
    res.status(200).json(status);

  } else if (req.method === 'POST') {
    // Update status endpoint (used internally by lighthouse.js)
    const { auditId, ...statusData } = req.body;
    console.log(`[AUDIT-STATUS] POST request to update ${auditId}:`, statusData);

    if (!auditId) {
      return res.status(400).json({ error: 'auditId required' });
    }

    const updatedStatus = setAuditStatus(auditId, statusData);
    console.log(`[AUDIT-STATUS] Status updated for ${auditId}`);

    res.status(200).json({ success: true });

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}