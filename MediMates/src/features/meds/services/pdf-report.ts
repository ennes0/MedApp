/**
 * PDF Report Generator — Medication Analytics Report
 *
 * Generates a professional PDF with:
 * - Patient summary header
 * - Medication list with details
 * - Adherence chart (SVG bar chart)
 * - Weekly dose log table
 * - Summary statistics
 *
 * Uses expo-print for HTML → PDF conversion and expo-sharing for export.
 */

import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Medication, DayLog, DoseLogEntry } from '@/src/types/firebase';

/* ── Types ── */
interface DoseLogMap {
  [dateStr: string]: DayLog | undefined;
}

interface MedReportData {
  medications: Medication[];
  doseLogs: DoseLogMap;
  userName: string;
  dateGenerated: Date;
}

/* ── Chart SVG Generators ── */

function generateAdherenceBarChart(
  medications: Medication[],
  doseLogs: DoseLogMap,
  days: number = 7,
): string {
  const today = startOfDay(new Date());
  const dates = eachDayOfInterval({
    start: subDays(today, days - 1),
    end: today,
  });

  // Calculate adherence % per day
  const dailyData = dates.map((date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayLog = doseLogs[dateStr];
    let taken = 0;
    let total = 0;

    medications.forEach((med) => {
      if (med.paused) return;
      const timesCount = med.schedule.times?.length ?? 0;
      total += timesCount;

      if (dayLog?.entries) {
        const medDoses = dayLog.entries.filter(
          (d) => d.medId === med.id && d.status === 'taken',
        );
        taken += medDoses.length;
      }
    });

    const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
    return { dateStr, label: format(date, 'EEE'), pct, taken, total };
  });

  const barWidth = 50;
  const barGap = 12;
  const chartWidth = (barWidth + barGap) * days + 40;
  const chartHeight = 200;
  const maxBarH = 150;

  const bars = dailyData
    .map((d, i) => {
      const x = 40 + i * (barWidth + barGap);
      const barH = (d.pct / 100) * maxBarH;
      const y = chartHeight - 30 - barH;
      const color = d.pct >= 80 ? '#34C759' : d.pct >= 50 ? '#FF9500' : '#FF3B30';

      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="6" fill="${color}" opacity="0.85"/>
        <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="12" font-weight="600" fill="#1C1C1E">${d.pct}%</text>
        <text x="${x + barWidth / 2}" y="${chartHeight - 10}" text-anchor="middle" font-size="11" fill="#8E8E93">${d.label}</text>
      `;
    })
    .join('');

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100]
    .map((val) => {
      const y = chartHeight - 30 - (val / 100) * maxBarH;
      return `
        <text x="32" y="${y + 4}" text-anchor="end" font-size="10" fill="#C7C7CC">${val}</text>
        <line x1="38" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="#E5E5EA" stroke-width="0.5" stroke-dasharray="4"/>
      `;
    })
    .join('');

  return `
    <svg width="${chartWidth}" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">
      ${yLabels}
      ${bars}
    </svg>
  `;
}

function generateMedDistributionChart(medications: Medication[]): string {
  const active = medications.filter((m) => !m.paused).length;
  const paused = medications.filter((m) => m.paused).length;
  const withReminders = medications.filter((m) => m.reminderEnabled && !m.paused).length;

  const data = [
    { label: 'Active', value: active, color: '#34C759' },
    { label: 'Paused', value: paused, color: '#FF9500' },
    { label: 'With Reminders', value: withReminders, color: '#007AFF' },
  ];

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barH = 28;
  const gap = 16;
  const chartW = 400;
  const chartH = data.length * (barH + gap) + 20;

  const bars = data
    .map((d, i) => {
      const y = 10 + i * (barH + gap);
      const w = (d.value / maxVal) * (chartW - 150);
      return `
        <text x="0" y="${y + barH / 2 + 5}" font-size="12" fill="#8E8E93">${d.label}</text>
        <rect x="120" y="${y}" width="${Math.max(w, 4)}" height="${barH}" rx="6" fill="${d.color}" opacity="0.8"/>
        <text x="${125 + w}" y="${y + barH / 2 + 5}" font-size="13" font-weight="600" fill="#1C1C1E">${d.value}</text>
      `;
    })
    .join('');

  return `
    <svg width="${chartW}" height="${chartH}" xmlns="http://www.w3.org/2000/svg">
      ${bars}
    </svg>
  `;
}

/* ── Dose Log Table ── */

function generateDoseLogTable(
  medications: Medication[],
  doseLogs: DoseLogMap,
  days: number = 7,
): string {
  const today = startOfDay(new Date());
  const dates = eachDayOfInterval({
    start: subDays(today, days - 1),
    end: today,
  });

  const headers = dates.map((d) => `<th>${format(d, 'MMM d')}<br/><span style="font-weight:400;color:#8E8E93;font-size:10px">${format(d, 'EEE')}</span></th>`).join('');

  const rows = medications
    .filter((m) => !m.paused)
    .map((med) => {
      const cells = dates
        .map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayLog = doseLogs[dateStr];
          const timesCount = med.schedule.times?.length ?? 0;

          if (timesCount === 0) return '<td style="color:#C7C7CC">—</td>';

          let taken = 0;
          if (dayLog?.entries) {
            taken = dayLog.entries.filter(
              (d) => d.medId === med.id && d.status === 'taken',
            ).length;
          }

          const pct = Math.round((taken / timesCount) * 100);
          const bg = pct >= 80 ? '#E8F5E9' : pct >= 50 ? '#FFF3E0' : pct > 0 ? '#FFEBEE' : '#F5F5F5';
          const color = pct >= 80 ? '#2E7D32' : pct >= 50 ? '#E65100' : pct > 0 ? '#C62828' : '#BDBDBD';

          return `<td style="background:${bg};color:${color};font-weight:600">${taken}/${timesCount}</td>`;
        })
        .join('');

      return `
        <tr>
          <td style="text-align:left;font-weight:600">
            <span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:${med.color ?? '#007AFF'};margin-right:6px"></span>
            ${med.name}
          </td>
          ${cells}
        </tr>
      `;
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th style="text-align:left">Medication</th>
          ${headers}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/* ── Main HTML Generator ── */

function generateReportHTML(data: MedReportData): string {
  const { medications, doseLogs, userName, dateGenerated } = data;

  const activeMeds = medications.filter((m) => !m.paused);
  const totalDailyDoses = activeMeds.reduce(
    (sum, m) => sum + (m.schedule.times?.length ?? 0),
    0,
  );
  const medsWithReminders = activeMeds.filter((m) => m.reminderEnabled).length;

  // 7-day adherence calculation
  const today = startOfDay(new Date());
  const weekDates = eachDayOfInterval({
    start: subDays(today, 6),
    end: today,
  });
  let weekTaken = 0;
  let weekTotal = 0;
  weekDates.forEach((date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayLog = doseLogs[dateStr];
    activeMeds.forEach((med) => {
      const timesCount = med.schedule.times?.length ?? 0;
      weekTotal += timesCount;
      if (dayLog?.entries) {
        weekTaken += dayLog.entries.filter(
          (d) => d.medId === med.id && d.status === 'taken',
        ).length;
      }
    });
  });
  const weekAdherence = weekTotal > 0 ? Math.round((weekTaken / weekTotal) * 100) : 0;

  const adherenceChart = generateAdherenceBarChart(medications, doseLogs);
  const distributionChart = generateMedDistributionChart(medications);
  const doseTable = generateDoseLogTable(medications, doseLogs);

  const medCards = medications
    .map(
      (med) => `
      <div class="med-card">
        <div class="med-header">
          <div class="color-dot" style="background:${med.color ?? '#007AFF'}"></div>
          <div>
            <div class="med-name">${med.name} ${med.paused ? '<span class="badge-paused">PAUSED</span>' : ''}</div>
            <div class="med-info">${med.dosage} ${med.unit} · ${med.schedule.frequency.replace(/_/g, ' ')}</div>
          </div>
        </div>
        <div class="med-details">
          ${med.form ? `<span class="tag">💊 ${med.form}</span>` : ''}
          ${med.route ? `<span class="tag">🏥 ${med.route}</span>` : ''}
          ${med.reminderEnabled ? '<span class="tag tag-active">🔔 Reminders On</span>' : '<span class="tag tag-muted">🔕 No Reminders</span>'}
          ${med.schedule.times?.length ? `<span class="tag">⏰ ${med.schedule.times.length}x/day</span>` : ''}
          ${med.refill?.enabled ? `<span class="tag">📦 Stock: ${med.refill.currentStock ?? '—'}</span>` : ''}
        </div>
        ${med.notes ? `<div class="med-notes">${med.notes}</div>` : ''}
      </div>
    `,
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
    color: #1C1C1E;
    background: #FFFFFF;
    padding: 40px;
    line-height: 1.5;
  }

  /* Header */
  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 2px solid #007AFF;
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-icon {
    width: 48px; height: 48px; border-radius: 12px;
    background: linear-gradient(135deg, #007AFF, #5856D6);
    color: white; display: flex; align-items: center; justify-content: center;
    font-size: 24px; font-weight: 700;
  }
  .brand-name { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
  .brand-sub { font-size: 13px; color: #8E8E93; }
  .meta { text-align: right; }
  .meta-name { font-size: 16px; font-weight: 600; }
  .meta-date { font-size: 12px; color: #8E8E93; margin-top: 2px; }

  /* Summary Stats */
  .stats-grid {
    display: flex; gap: 16px; margin-bottom: 32px;
  }
  .stat-card {
    flex: 1; padding: 20px; border-radius: 16px;
    text-align: center;
  }
  .stat-card.meds { background: #E3F2FD; }
  .stat-card.adherence { background: #E8F5E9; }
  .stat-card.doses { background: #FFF3E0; }
  .stat-card.reminders { background: #F3E5F5; }
  .stat-value { font-size: 32px; font-weight: 800; letter-spacing: -1px; }
  .stat-card.meds .stat-value { color: #1565C0; }
  .stat-card.adherence .stat-value { color: #2E7D32; }
  .stat-card.doses .stat-value { color: #E65100; }
  .stat-card.reminders .stat-value { color: #6A1B9A; }
  .stat-label { font-size: 12px; color: #8E8E93; margin-top: 4px; font-weight: 500; }

  /* Section */
  .section { margin-bottom: 32px; }
  .section-title {
    font-size: 18px; font-weight: 700; margin-bottom: 16px;
    padding-bottom: 8px; border-bottom: 1px solid #E5E5EA;
  }

  /* Chart */
  .chart-container {
    background: #FAFAFA; border-radius: 16px; padding: 24px;
    margin-bottom: 16px; overflow-x: auto;
  }

  /* Med cards */
  .med-card {
    background: #F9F9F9; border-radius: 12px; padding: 16px;
    margin-bottom: 12px; border-left: 4px solid #007AFF;
  }
  .med-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .color-dot { width: 14px; height: 14px; border-radius: 7px; flex-shrink: 0; }
  .med-name { font-size: 16px; font-weight: 700; }
  .med-info { font-size: 12px; color: #8E8E93; }
  .med-details { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag {
    display: inline-block; font-size: 11px; padding: 3px 10px;
    border-radius: 20px; background: #E8E8ED; color: #3A3A3C;
  }
  .tag-active { background: #E8F5E9; color: #2E7D32; }
  .tag-muted { background: #F5F5F5; color: #8E8E93; }
  .badge-paused {
    display: inline-block; font-size: 10px; padding: 2px 8px;
    border-radius: 4px; background: #FFF3E0; color: #E65100;
    font-weight: 700; margin-left: 6px; vertical-align: middle;
  }
  .med-notes { font-size: 12px; color: #8E8E93; font-style: italic; margin-top: 8px; }

  /* Dose table */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { padding: 10px 8px; text-align: center; border-bottom: 1px solid #E5E5EA; }
  th { background: #F2F2F7; font-weight: 600; color: #3A3A3C; }
  tbody tr:hover { background: #FAFAFA; }

  /* Footer */
  .footer {
    margin-top: 40px; padding-top: 16px;
    border-top: 1px solid #E5E5EA;
    text-align: center; font-size: 11px; color: #C7C7CC;
  }

  @media print {
    body { padding: 20px; }
    .chart-container { break-inside: avoid; }
    .med-card { break-inside: avoid; }
  }
</style>
</head>
<body>

  <!-- Header -->
  <div class="report-header">
    <div class="brand">
      <div class="brand-icon">M</div>
      <div>
        <div class="brand-name">MediMates</div>
        <div class="brand-sub">Medication Analytics Report</div>
      </div>
    </div>
    <div class="meta">
      <div class="meta-name">${userName}</div>
      <div class="meta-date">${format(dateGenerated, 'MMMM d, yyyy · h:mm a')}</div>
    </div>
  </div>

  <!-- Summary Stats -->
  <div class="stats-grid">
    <div class="stat-card meds">
      <div class="stat-value">${activeMeds.length}</div>
      <div class="stat-label">Active Medications</div>
    </div>
    <div class="stat-card adherence">
      <div class="stat-value">${weekAdherence}%</div>
      <div class="stat-label">7-Day Adherence</div>
    </div>
    <div class="stat-card doses">
      <div class="stat-value">${totalDailyDoses}</div>
      <div class="stat-label">Daily Doses</div>
    </div>
    <div class="stat-card reminders">
      <div class="stat-value">${medsWithReminders}</div>
      <div class="stat-label">Active Reminders</div>
    </div>
  </div>

  <!-- Adherence Chart -->
  <div class="section">
    <div class="section-title">📊 7-Day Adherence Trend</div>
    <div class="chart-container">
      ${adherenceChart}
    </div>
  </div>

  <!-- Medication Overview Chart -->
  <div class="section">
    <div class="section-title">💊 Medication Overview</div>
    <div class="chart-container">
      ${distributionChart}
    </div>
  </div>

  <!-- Dose Log Table -->
  <div class="section">
    <div class="section-title">📋 Weekly Dose Log</div>
    ${doseTable}
  </div>

  <!-- Medication Details -->
  <div class="section">
    <div class="section-title">💊 Medication Details</div>
    ${medCards}
  </div>

  <!-- Footer -->
  <div class="footer">
    Generated by MediMates · ${format(dateGenerated, 'yyyy-MM-dd')} · This report is for personal use only and does not replace medical advice.
  </div>

</body>
</html>
  `;
}

/* ── Public API ── */

export async function generateMedReport(data: MedReportData): Promise<void> {
  // Lazy-load native modules so the file can be imported in Expo Go
  // without crashing at startup. The actual call will fail gracefully.
  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');

  const html = generateReportHTML(data);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'MediMates Report',
    UTI: 'com.adobe.pdf',
  });
}

/**
 * Generate a report with dummy data for demo/testing
 */
export async function generateDummyReport(
  medications: Medication[],
  userName: string,
): Promise<void> {
  // Generate dummy dose logs for the past 7 days
  const today = startOfDay(new Date());
  const doseLogs: DoseLogMap = {};

  for (let i = 0; i < 7; i++) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const entries: DoseLogEntry[] = [];

    medications.forEach((med) => {
      if (med.paused) return;
      (med.schedule.times ?? []).forEach((time) => {
        // Simulate ~75% adherence with some randomness
        const isTaken = Math.random() > (i === 0 ? 0.15 : 0.25);
        entries.push({
          medId: med.id,
          medName: med.name,
          scheduledTime: time,
          status: isTaken ? 'taken' : (Math.random() > 0.5 ? 'skipped' : 'pending'),
          loggedAt: isTaken ? Timestamp.fromDate(date) : null,
          note: '',
        });
      });
    });

    doseLogs[dateStr] = {
      date: dateStr,
      entries,
      updatedAt: Timestamp.fromDate(date),
    };
  }

  await generateMedReport({
    medications,
    doseLogs,
    userName,
    dateGenerated: new Date(),
  });
}
