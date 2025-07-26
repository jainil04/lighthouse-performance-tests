import fs from 'fs';
import path from 'path';

// File-based storage for audit statuses (works better in serverless environment)
const CACHE_DIR = '/tmp/audit-cache';

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getStatusFilePath(auditId) {
  return path.join(CACHE_DIR, `${auditId}.json`);
}

export function getAuditStatus(auditId) {
  try {
    const filePath = getStatusFilePath(auditId);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const status = JSON.parse(data);
      console.log(`[STORE] Getting status for ${auditId}:`, status);
      return status;
    }
  } catch (error) {
    console.error(`[STORE] Error reading status for ${auditId}:`, error);
  }

  const notFoundStatus = {
    status: 'not-found',
    message: 'Audit not found',
    progress: 0
  };
  console.log(`[STORE] Status not found for ${auditId}, returning:`, notFoundStatus);
  return notFoundStatus;
}

export function setAuditStatus(auditId, statusData) {
  try {
    const fullStatus = {
      ...statusData,
      timestamp: new Date().toISOString()
    };

    const filePath = getStatusFilePath(auditId);
    fs.writeFileSync(filePath, JSON.stringify(fullStatus, null, 2));
    console.log(`[STORE] Set status for ${auditId} in file:`, fullStatus);

    // Clean up old status files (older than 10 minutes)
    cleanupOldFiles();

    return fullStatus;
  } catch (error) {
    console.error(`[STORE] Error setting status for ${auditId}:`, error);
    throw error;
  }
}

function cleanupOldFiles() {
  try {
    const cutoff = Date.now() - (10 * 60 * 1000); // 10 minutes
    const files = fs.readdirSync(CACHE_DIR);

    files.forEach(file => {
      const filePath = path.join(CACHE_DIR, file);
      const stats = fs.statSync(filePath);
      if (stats.mtime.getTime() < cutoff) {
        fs.unlinkSync(filePath);
        console.log(`[STORE] Cleaned up old status file: ${file}`);
      }
    });
  } catch (error) {
    console.error('[STORE] Error during cleanup:', error);
  }
}

export function getAllStatuses() {
  try {
    const files = fs.readdirSync(CACHE_DIR);
    const statuses = [];

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const auditId = file.replace('.json', '');
        const status = getAuditStatus(auditId);
        if (status.status !== 'not-found') {
          statuses.push([auditId, status]);
        }
      }
    });

    return statuses;
  } catch (error) {
    console.error('[STORE] Error getting all statuses:', error);
    return [];
  }
}
