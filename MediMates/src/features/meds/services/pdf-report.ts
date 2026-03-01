/**
 * PDF Report Generator — Medication Analytics Report (Enhanced)
 *
 * Generates a professional PDF with:
 * - Patient summary header
 * - Overall adherence hero + streak info
 * - Per-medication detailed analytics cards (adherence, taken/skipped/missed, streaks, time slots)
 * - Status distribution bar
 * - Time-of-day pattern chart
 * - Adherence trend chart (SVG bar chart)
 * - Detailed dose log table with per-status coloring
 * - Medication details section
 *
 * Uses expo-print for HTML → PDF conversion and expo-sharing for export.
 */

import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Medication, DayLog, DoseLogEntry } from '@/src/types/firebase';
import type { OverallAnalytics, MedAnalytics, AnalyticsPeriod } from '@/src/features/meds/hooks/use-dose-logs';

/* ── Types ── */
interface DoseLogMap {
  [dateStr: string]: DayLog | undefined;
}

interface MedReportData {
  medications: Medication[];
  doseLogs: DoseLogMap;
  userName: string;
  dateGenerated: Date;
  period?: AnalyticsPeriod;
  analytics?: OverallAnalytics;
}

/* ── Chart SVG Generators ── */

function generateAdherenceBarChart(
  dailyTrend: { date: string; label: string; pct: number; taken: number; total: number }[],
): string {
  const days = dailyTrend.length;
  const barWidth = Math.min(50, Math.max(20, 400 / days));
  const barGap = Math.min(12, Math.max(4, 200 / days));
  const chartWidth = (barWidth + barGap) * days + 60;
  const chartHeight = 220;
  const maxBarH = 160;

  const bars = dailyTrend
    .map((d, i) => {
      const x = 45 + i * (barWidth + barGap);
      const barH = Math.max((d.pct / 100) * maxBarH, 2);
      const y = chartHeight - 35 - barH;
      const color = d.pct >= 80 ? '#34C759' : d.pct >= 50 ? '#FF9500' : '#FF3B30';

      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="6" fill="${color}" opacity="0.85"/>
        <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="11" font-weight="600" fill="#1C1C1E">${d.pct}%</text>
        <text x="${x + barWidth / 2}" y="${chartHeight - 12}" text-anchor="middle" font-size="10" fill="#8E8E93">${d.label}</text>
      `;
    })
    .join('');

  const yLabels = [0, 25, 50, 75, 100]
    .map((val) => {
      const y = chartHeight - 35 - (val / 100) * maxBarH;
      return `
        <text x="38" y="${y + 4}" text-anchor="end" font-size="10" fill="#C7C7CC">${val}</text>
        <line x1="43" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="#E5E5EA" stroke-width="0.5" stroke-dasharray="4"/>
      `;
    })
    .join('');

  return `<svg width="${chartWidth}" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">${yLabels}${bars}</svg>`;
}

function generateStatusDistributionBar(dist: { taken: number; skipped: number; missed: number }): string {
  const total = dist.taken + dist.skipped + dist.missed;
  if (total === 0) return '<p style="color:#8E8E93;text-align:center">No dose data</p>';

  const tPct = (dist.taken / total) * 100;
  const sPct = (dist.skipped / total) * 100;
  const mPct = (dist.missed / total) * 100;

  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <div style="flex:1;height:20px;border-radius:10px;overflow:hidden;display:flex">
        ${tPct > 0 ? `<div style="width:${tPct}%;background:#34C759;height:100%"></div>` : ''}
        ${sPct > 0 ? `<div style="width:${sPct}%;background:#FF9500;height:100%"></div>` : ''}
        ${mPct > 0 ? `<div style="width:${mPct}%;background:#FF3B30;height:100%"></div>` : ''}
      </div>
    </div>
    <div style="display:flex;gap:24px;font-size:12px">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:#34C759;margin-right:4px"></span> Taken: ${dist.taken} (${Math.round(tPct)}%)</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:#FF9500;margin-right:4px"></span> Skipped: ${dist.skipped} (${Math.round(sPct)}%)</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:#FF3B30;margin-right:4px"></span> Missed: ${dist.missed} (${Math.round(mPct)}%)</span>
    </div>
  `;
}

function generateTimeOfDayChart(pattern: OverallAnalytics['timeOfDayPattern']): string {
  const slots = [
    { key: 'morning', icon: '🌅', label: 'Morning', sub: '5am – 12pm', ...pattern.morning },
    { key: 'afternoon', icon: '☀️', label: 'Afternoon', sub: '12pm – 5pm', ...pattern.afternoon },
    { key: 'evening', icon: '🌇', label: 'Evening', sub: '5pm – 12am', ...pattern.evening },
    { key: 'night', icon: '🌙', label: 'Night', sub: '12am – 5am', ...pattern.night },
  ];

  return `
    <div style="display:flex;gap:12px">
      ${slots.map((s) => {
        const color = s.total > 0 ? (s.pct >= 80 ? '#34C759' : s.pct >= 50 ? '#FF9500' : '#FF3B30') : '#C7C7CC';
        return `
          <div style="flex:1;text-align:center;background:#FAFAFA;border-radius:12px;padding:16px 8px">
            <div style="font-size:22px;margin-bottom:4px">${s.icon}</div>
            <div style="font-size:12px;font-weight:600;color:#3A3A3C">${s.label}</div>
            <div style="font-size:24px;font-weight:800;color:${color};margin:4px 0">${s.total > 0 ? s.pct + '%' : '—'}</div>
            <div style="font-size:10px;color:#8E8E93">${s.total > 0 ? s.taken + '/' + s.total + ' doses' : s.sub}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function generatePerMedCards(perMed: MedAnalytics[]): string {
  if (perMed.length === 0) return '<p style="color:#8E8E93;text-align:center">No active medications</p>';

  return perMed.map((ma) => {
    const color = ma.adherencePct >= 80 ? '#34C759' : ma.adherencePct >= 50 ? '#FF9500' : '#FF3B30';
    const pctWidth = Math.min(ma.adherencePct, 100);

    // Time slot rows
    const timeSlotRows = Object.entries(ma.timeSlotStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, stats]) => {
        const slotPct = stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0;
        const slotColor = slotPct >= 80 ? '#34C759' : slotPct >= 50 ? '#FF9500' : '#FF3B30';
        // Format time to 12h
        const [h, m] = time.split(':').map(Number);
        const ampm = h! >= 12 ? 'PM' : 'AM';
        const h12 = h! % 12 || 12;
        const timeLabel = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;

        return `
          <tr>
            <td style="text-align:left;font-weight:500;padding:4px 8px">${timeLabel}</td>
            <td style="padding:4px 8px">
              <div style="background:#F2F2F7;border-radius:4px;height:8px;overflow:hidden">
                <div style="width:${slotPct}%;background:${slotColor};height:100%;border-radius:4px"></div>
              </div>
            </td>
            <td style="text-align:right;font-weight:600;color:${slotColor};padding:4px 8px">${stats.taken}/${stats.total}</td>
          </tr>
        `;
      })
      .join('');

    // Mini trend dots
    const trendDots = ma.dailyTrend
      .filter((d) => d.pct !== -1)
      .map((d) => {
        const dotColor = d.pct >= 80 ? '#34C759' : d.pct >= 50 ? '#FF9500' : '#FF3B30';
        return `<span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:${dotColor};margin:0 2px" title="${d.date}: ${d.pct}%"></span>`;
      })
      .join('');

    return `
      <div class="med-analytics-card" style="border-left:4px solid ${ma.medColor};background:#F9F9F9;border-radius:12px;padding:16px;margin-bottom:16px;page-break-inside:avoid">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:14px;height:14px;border-radius:7px;background:${ma.medColor}"></div>
            <div>
              <div style="font-size:16px;font-weight:700">${ma.medName}</div>
              <div style="font-size:11px;color:#8E8E93">${ma.takenCount}/${ma.totalScheduled} doses · 🔥 ${ma.currentStreak}d streak</div>
            </div>
          </div>
          <div style="font-size:28px;font-weight:800;color:${color}">${ma.adherencePct}%</div>
        </div>

        <!-- Progress bar -->
        <div style="background:#E5E5EA;border-radius:4px;height:8px;overflow:hidden;margin-bottom:12px">
          <div style="width:${pctWidth}%;background:${ma.medColor};height:100%;border-radius:4px"></div>
        </div>

        <!-- Stats grid -->
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <div style="flex:1;text-align:center;background:#E8F5E9;border-radius:8px;padding:8px 4px">
            <div style="font-size:18px;font-weight:700;color:#34C759">${ma.takenCount}</div>
            <div style="font-size:10px;color:#8E8E93">Taken</div>
          </div>
          <div style="flex:1;text-align:center;background:#FFF3E0;border-radius:8px;padding:8px 4px">
            <div style="font-size:18px;font-weight:700;color:#FF9500">${ma.skippedCount}</div>
            <div style="font-size:10px;color:#8E8E93">Skipped</div>
          </div>
          <div style="flex:1;text-align:center;background:#FFEBEE;border-radius:8px;padding:8px 4px">
            <div style="font-size:18px;font-weight:700;color:#FF3B30">${ma.missedCount}</div>
            <div style="font-size:10px;color:#8E8E93">Missed</div>
          </div>
          <div style="flex:1;text-align:center;background:#E3F2FD;border-radius:8px;padding:8px 4px">
            <div style="font-size:18px;font-weight:700;color:#007AFF">⭐ ${ma.bestStreak}</div>
            <div style="font-size:10px;color:#8E8E93">Best Streak</div>
          </div>
        </div>

        <!-- Per-time slot table -->
        ${timeSlotRows ? `
          <div style="margin-bottom:10px">
            <div style="font-size:11px;font-weight:600;color:#8E8E93;margin-bottom:4px">Per-Time Slot</div>
            <table style="width:100%;font-size:11px;border-collapse:collapse">
              ${timeSlotRows}
            </table>
          </div>
        ` : ''}

        <!-- Daily trend dots -->
        <div>
          <div style="font-size:11px;font-weight:600;color:#8E8E93;margin-bottom:4px">Daily Trend</div>
          <div>${trendDots}</div>
        </div>

        ${ma.lastTakenDate ? `<div style="font-size:10px;color:#C7C7CC;margin-top:8px;font-style:italic">Last taken: ${ma.lastTakenDate}</div>` : ''}
      </div>
    `;
  }).join('');
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

  const headers = dates
    .map(
      (d) =>
        `<th>${format(d, 'MMM d')}<br/><span style="font-weight:400;color:#8E8E93;font-size:10px">${format(d, 'EEE')}</span></th>`,
    )
    .join('');

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
          let skipped = 0;
          if (dayLog?.entries) {
            taken = dayLog.entries.filter(
              (d) => d.medId === med.id && d.status === 'taken',
            ).length;
            skipped = dayLog.entries.filter(
              (d) => d.medId === med.id && d.status === 'skipped',
            ).length;
          }
          const missed = timesCount - taken - skipped;

          const pct = Math.round((taken / timesCount) * 100);
          const bg =
            pct >= 80
              ? '#E8F5E9'
              : pct >= 50
                ? '#FFF3E0'
                : pct > 0
                  ? '#FFEBEE'
                  : '#F5F5F5';
          const color =
            pct >= 80
              ? '#2E7D32'
              : pct >= 50
                ? '#E65100'
                : pct > 0
                  ? '#C62828'
                  : '#BDBDBD';

          // Show detailed status: ✓ taken / ✗ skipped / ? missed
          const detail =
            skipped > 0 || missed > 0
              ? `<br/><span style="font-size:9px;color:#8E8E93">✓${taken} ✗${skipped} ?${Math.max(missed, 0)}</span>`
              : '';

          return `<td style="background:${bg};color:${color};font-weight:600">${taken}/${timesCount}${detail}</td>`;
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
  const { medications, doseLogs, userName, dateGenerated, period = 7, analytics } = data;

  const activeMeds = medications.filter((m) => !m.paused);
  const totalDailyDoses = activeMeds.reduce(
    (sum, m) => sum + (m.schedule.times?.length ?? 0),
    0,
  );
  const medsWithReminders = activeMeds.filter((m) => m.reminderEnabled).length;

  // Use real analytics if available, otherwise compute basic
  const overallAdherence = analytics?.overallAdherencePct ?? 0;
  const currentStreak = analytics?.currentPerfectStreak ?? 0;
  const bestStreak = analytics?.bestPerfectStreak ?? 0;
  const totalTaken = analytics?.totalTaken ?? 0;
  const totalScheduled = analytics?.totalScheduled ?? 0;

  // Charts
  const adherenceChart = analytics?.dailyTrend
    ? generateAdherenceBarChart(analytics.dailyTrend)
    : generateAdherenceBarChartLegacy(medications, doseLogs, period);

  const statusDistHTML = analytics?.statusDistribution
    ? generateStatusDistributionBar(analytics.statusDistribution)
    : '';

  const timeOfDayHTML = analytics?.timeOfDayPattern
    ? generateTimeOfDayChart(analytics.timeOfDayPattern)
    : '';

  const perMedCardsHTML = analytics?.perMed
    ? generatePerMedCards(analytics.perMed)
    : '';

  const doseTable = generateDoseLogTable(medications, doseLogs, Math.min(period, 14));

  const medDetailCards = medications
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
          ${med.mealRelation && med.mealRelation !== 'no_restriction' ? `<span class="tag">🍽️ ${med.mealRelation.replace(/_/g, ' ')}</span>` : ''}
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
  .stats-grid { display: flex; gap: 12px; margin-bottom: 32px; }
  .stat-card {
    flex: 1; padding: 16px; border-radius: 16px; text-align: center;
  }
  .stat-card.meds { background: #E3F2FD; }
  .stat-card.adherence { background: #E8F5E9; }
  .stat-card.streak { background: #FFF3E0; }
  .stat-card.best-streak { background: #F3E5F5; }
  .stat-card.doses { background: #FFF3E0; }
  .stat-card.reminders { background: #F3E5F5; }
  .stat-value { font-size: 28px; font-weight: 800; letter-spacing: -1px; }
  .stat-card.meds .stat-value { color: #1565C0; }
  .stat-card.adherence .stat-value { color: #2E7D32; }
  .stat-card.streak .stat-value { color: #E65100; }
  .stat-card.best-streak .stat-value { color: #6A1B9A; }
  .stat-card.doses .stat-value { color: #E65100; }
  .stat-card.reminders .stat-value { color: #6A1B9A; }
  .stat-label { font-size: 11px; color: #8E8E93; margin-top: 4px; font-weight: 500; }

  /* Hero Adherence */
  .hero-adherence {
    background: #FAFAFA; border-radius: 20px; padding: 24px;
    margin-bottom: 32px; text-align: center;
  }
  .hero-adherence .hero-value {
    font-size: 56px; font-weight: 800; letter-spacing: -2px;
  }
  .hero-adherence .hero-label {
    font-size: 14px; color: #8E8E93; margin-bottom: 4px;
  }
  .hero-adherence .hero-bar {
    height: 12px; border-radius: 6px; background: #E5E5EA; overflow: hidden; margin: 12px 0;
  }
  .hero-adherence .hero-bar-fill {
    height: 100%; border-radius: 6px;
  }
  .hero-adherence .hero-sub {
    font-size: 12px; color: #8E8E93;
  }

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
    page-break-inside: avoid;
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
    .med-analytics-card { break-inside: avoid; }
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
        <div class="brand-sub">Medication Analytics Report · ${period}-Day Overview</div>
      </div>
    </div>
    <div class="meta">
      <div class="meta-name">${userName}</div>
      <div class="meta-date">${format(dateGenerated, 'MMMM d, yyyy · h:mm a')}</div>
    </div>
  </div>

  <!-- Hero Adherence -->
  <div class="hero-adherence">
    <div class="hero-label">${period}-Day Adherence</div>
    <div class="hero-value" style="color:${overallAdherence >= 80 ? '#34C759' : overallAdherence >= 50 ? '#FF9500' : '#FF3B30'}">${overallAdherence}%</div>
    <div class="hero-bar">
      <div class="hero-bar-fill" style="width:${overallAdherence}%;background:${overallAdherence >= 80 ? '#34C759' : overallAdherence >= 50 ? '#FF9500' : '#FF3B30'}"></div>
    </div>
    <div class="hero-sub">${totalTaken} of ${totalScheduled} doses taken</div>
  </div>

  <!-- Summary Stats -->
  <div class="stats-grid">
    <div class="stat-card meds">
      <div class="stat-value">${activeMeds.length}</div>
      <div class="stat-label">Active Medications</div>
    </div>
    <div class="stat-card adherence">
      <div class="stat-value">${totalDailyDoses}</div>
      <div class="stat-label">Daily Doses</div>
    </div>
    <div class="stat-card streak">
      <div class="stat-value">🔥 ${currentStreak}</div>
      <div class="stat-label">Current Streak</div>
    </div>
    <div class="stat-card best-streak">
      <div class="stat-value">⭐ ${bestStreak}</div>
      <div class="stat-label">Best Streak</div>
    </div>
  </div>

  <!-- Adherence Trend Chart -->
  <div class="section">
    <div class="section-title">📊 ${period}-Day Adherence Trend</div>
    <div class="chart-container">
      ${adherenceChart}
    </div>
  </div>

  <!-- Status Distribution -->
  ${statusDistHTML ? `
  <div class="section">
    <div class="section-title">📈 Status Distribution</div>
    <div class="chart-container">
      ${statusDistHTML}
    </div>
  </div>
  ` : ''}

  <!-- Time of Day Pattern -->
  ${timeOfDayHTML ? `
  <div class="section">
    <div class="section-title">🕐 Time of Day Pattern</div>
    <div class="chart-container">
      ${timeOfDayHTML}
    </div>
  </div>
  ` : ''}

  <!-- Per-Medication Analytics -->
  ${perMedCardsHTML ? `
  <div class="section">
    <div class="section-title">💊 Per-Medication Analytics</div>
    ${perMedCardsHTML}
  </div>
  ` : ''}

  <!-- Dose Log Table -->
  <div class="section">
    <div class="section-title">📋 Dose Log (Last ${Math.min(period, 14)} Days)</div>
    ${doseTable}
    <div style="font-size:10px;color:#C7C7CC;margin-top:8px">
      ✓ = taken · ✗ = skipped · ? = missed/pending
    </div>
  </div>

  <!-- Medication Details -->
  <div class="section">
    <div class="section-title">💊 Medication Details</div>
    ${medDetailCards}
  </div>

  <!-- Footer -->
  <div class="footer">
    Generated by MediMates · ${format(dateGenerated, 'yyyy-MM-dd')} · ${period}-day report · This report is for personal use only and does not replace medical advice.
  </div>

</body>
</html>
  `;
}

/* ── Legacy fallback: adherence chart from raw doseLogs (no analytics) ── */

function generateAdherenceBarChartLegacy(
  medications: Medication[],
  doseLogs: DoseLogMap,
  days: number = 7,
): string {
  const today = startOfDay(new Date());
  const dates = eachDayOfInterval({
    start: subDays(today, days - 1),
    end: today,
  });

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
        taken += dayLog.entries.filter(
          (d) => d.medId === med.id && d.status === 'taken',
        ).length;
      }
    });

    const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
    return { date: dateStr, label: format(date, 'EEE'), pct, taken, total };
  });

  return generateAdherenceBarChart(dailyData);
}

/* ── Public API ── */

export async function generateMedReport(data: MedReportData): Promise<void> {
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
  const today = startOfDay(new Date());
  const doseLogs: DoseLogMap = {};

  for (let i = 0; i < 7; i++) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const entries: DoseLogEntry[] = [];

    medications.forEach((med) => {
      if (med.paused) return;
      (med.schedule.times ?? []).forEach((time) => {
        const isTaken = Math.random() > (i === 0 ? 0.15 : 0.25);
        entries.push({
          medId: med.id,
          medName: med.name,
          scheduledTime: time,
          status: isTaken ? 'taken' : Math.random() > 0.5 ? 'skipped' : 'pending',
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
