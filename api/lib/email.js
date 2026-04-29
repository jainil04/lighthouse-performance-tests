import { Resend } from 'resend';

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'alerts@lighthouse-monitor.dev';

export async function sendAlertEmail({ to, url, metric, value, threshold, comparison, runId }) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[email] RESEND_API_KEY not set — dev stub', { to, url, metric, value, threshold, comparison, runId });
    return { id: 'dev-stub' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const metricLabel = METRIC_LABELS[metric] ?? metric;
  const directionWord = comparison === 'below' ? 'dropped below' : 'exceeded';
  const subject = `[Lighthouse Monitor] ${metricLabel} regression on ${url}`;

  const historyUrl = `https://lighthouse-monitor.vercel.app/history?url=${encodeURIComponent(url)}`;

  const text = [
    `Lighthouse Monitor detected a performance regression.`,
    ``,
    `URL: ${url}`,
    `Metric: ${metricLabel}`,
    `Value: ${formatValue(metric, value)}`,
    `Threshold: ${directionWord} ${formatValue(metric, threshold)}`,
    ``,
    `View history: ${historyUrl}`,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin-top:0">Lighthouse Monitor Alert</h2>
  <p>A performance regression was detected on <strong>${escHtml(url)}</strong>.</p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0">
    <tr style="background:#f5f5f5">
      <td style="padding:8px 12px;font-weight:600">Metric</td>
      <td style="padding:8px 12px">${escHtml(metricLabel)}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;font-weight:600">Value</td>
      <td style="padding:8px 12px">${escHtml(formatValue(metric, value))}</td>
    </tr>
    <tr style="background:#f5f5f5">
      <td style="padding:8px 12px;font-weight:600">Alert condition</td>
      <td style="padding:8px 12px">${escHtml(directionWord)} ${escHtml(formatValue(metric, threshold))}</td>
    </tr>
  </table>
  <a href="${escHtml(historyUrl)}" style="display:inline-block;padding:10px 20px;background:#0070f3;color:#fff;text-decoration:none;border-radius:6px">View history →</a>
  <p style="margin-top:24px;font-size:12px;color:#666">
    This alert was triggered by a scheduled Lighthouse audit. To manage your alert settings, visit Lighthouse Monitor.
  </p>
</body>
</html>`.trim();

  // Throws on Resend API error so the caller can record email_error
  const result = await resend.emails.send({ from: FROM_ADDRESS, to, subject, text, html });
  return result;
}

function formatValue(metric, value) {
  const scoreMetrics = new Set(['performance', 'accessibility', 'best_practices', 'seo']);
  if (scoreMetrics.has(metric)) return String(Math.round(value));
  if (metric === 'cls') return Number(value).toFixed(3);
  return `${Math.round(value)}ms`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const METRIC_LABELS = {
  performance:    'Performance',
  accessibility:  'Accessibility',
  best_practices: 'Best Practices',
  seo:            'SEO',
  fcp:            'First Contentful Paint (FCP)',
  lcp:            'Largest Contentful Paint (LCP)',
  cls:            'Cumulative Layout Shift (CLS)',
  tbt:            'Total Blocking Time (TBT)',
  si:             'Speed Index (SI)',
  tti:            'Time to Interactive (TTI)',
};
