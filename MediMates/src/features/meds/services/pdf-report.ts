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
import type { AppleHealthTodaySummary } from '@/src/features/health/apple-health';
import {
  ICON_FOR_FORM,
  FREQUENCY_LABELS,
  ROUTES_OF_ADMINISTRATION,
  MEAL_RELATION_OPTIONS,
} from '@/src/features/meds/types';

/* ── Types ── */
interface DoseLogMap {
  [dateStr: string]: DayLog | undefined;
}

interface MedReportData {
  medications: Medication[];
  doseLogs: DoseLogMap;
  userName: string;
  userEmail?: string | null;
  userTimezone?: string;
  dateGenerated: Date;
  period?: AnalyticsPeriod;
  analytics?: OverallAnalytics;
  selectedMedicationId?: string;
  appleHealthSummary?: AppleHealthTodaySummary | null;
}

function getMedicationLabel(med: Medication): {
  frequencyLabel: string;
  routeLabel: string;
  mealLabel: string;
} {
  return {
    frequencyLabel: FREQUENCY_LABELS[med.schedule.frequency] ?? med.schedule.frequency,
    routeLabel:
      ROUTES_OF_ADMINISTRATION.find((r) => r.id === med.route)?.label ??
      med.route ??
      'Not specified',
    mealLabel:
      MEAL_RELATION_OPTIONS.find((m) => m.id === med.mealRelation)?.label ??
      med.mealRelation ??
      'No restriction',
  };
}

function extractMedLogs(
  med: Medication,
  doseLogs: DoseLogMap,
  period: AnalyticsPeriod,
): Array<{ date: string; taken: number; skipped: number; missed: number; total: number; pct: number; weekday: string; day: string }> {
  const today = startOfDay(new Date());
  const dates = eachDayOfInterval({
    start: subDays(today, period - 1),
    end: today,
  });

  return dates.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const log = doseLogs[dateStr];
    const total = med.schedule.times?.length ?? 0;
    const entries = log?.entries ?? [];
    const taken = entries.filter((e) => e.medId === med.id && e.status === 'taken').length;
    const skipped = entries.filter((e) => e.medId === med.id && e.status === 'skipped').length;
    const missed = Math.max(0, total - taken - skipped);
    const pct = total > 0 ? Math.round((taken / total) * 100) : 0;

    return {
      date: dateStr,
      taken,
      skipped,
      missed,
      total,
      pct,
      weekday: format(d, 'EEE'),
      day: format(d, 'd'),
    };
  });
}

function resolveMedAnalytics(
  med: Medication,
  analytics: OverallAnalytics | undefined,
  period: AnalyticsPeriod,
  doseLogs: DoseLogMap,
): MedAnalytics {
  const fromAnalytics = analytics?.perMed.find((m) => m.medId === med.id);
  if (fromAnalytics) return fromAnalytics;

  const timeline = extractMedLogs(med, doseLogs, period);
  const totalScheduled = timeline.reduce((sum, d) => sum + d.total, 0);
  const takenCount = timeline.reduce((sum, d) => sum + d.taken, 0);
  const skippedCount = timeline.reduce((sum, d) => sum + d.skipped, 0);
  const missedCount = timeline.reduce((sum, d) => sum + d.missed, 0);
  const adherencePct = totalScheduled > 0 ? Math.round((takenCount / totalScheduled) * 100) : 0;

  const slotStats: Record<string, { taken: number; total: number; skipped: number }> = {};
  for (const t of med.schedule.times ?? []) {
    slotStats[t] = { taken: 0, total: period, skipped: 0 };
  }

  return {
    medId: med.id,
    medName: med.name,
    medColor: med.color ?? '#378ADD',
    adherencePct,
    totalScheduled,
    takenCount,
    skippedCount,
    missedCount,
    snoozedCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastTakenDate: null,
    timeSlotStats: slotStats,
    dailyTrend: timeline.map((row) => ({
      date: row.date,
      label: row.weekday,
      pct: row.pct,
      taken: row.taken,
      total: row.total,
      skipped: row.skipped,
      missed: row.missed,
    })),
  };
}

function medStatusDistribution(analytics: MedAnalytics): { taken: number; skipped: number; missed: number } {
  return {
    taken: analytics.takenCount,
    skipped: analytics.skippedCount,
    missed: analytics.missedCount,
  };
}

function pickMedIconName(med: Medication): string {
  if (!med.form) return 'pill.fill';
  return ICON_FOR_FORM[med.form] ?? 'pill.fill';
}

function generateRadialGaugeSVG(pct: number, color: string, label: string): string {
  const size = 160;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const bounded = Math.max(0, Math.min(100, pct));
  const fill = (bounded / 100) * circumference;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#9EE3D6"/>
          <stop offset="100%" stop-color="${color}"/>
        </linearGradient>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${radius}" stroke="#E8EEF7" stroke-width="${stroke}" fill="none"/>
      <circle
        cx="${cx}"
        cy="${cy}"
        r="${radius}"
        stroke="url(#gaugeGrad)"
        stroke-width="${stroke}"
        fill="none"
        stroke-linecap="round"
        stroke-dasharray="${fill} ${circumference - fill}"
        transform="rotate(-90 ${cx} ${cy})"
      />
      <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="34" font-weight="800" fill="#1D3658">${bounded}%</text>
      <text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="11" fill="#6A7D95">${label}</text>
    </svg>
  `;
}

function generateDonutChartSVG(dist: { taken: number; skipped: number; missed: number }): string {
  const size = 180;
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(1, dist.taken + dist.skipped + dist.missed);
  const segments = [
    { value: dist.taken, color: '#6BCB8C' },
    { value: dist.skipped, color: '#F2B56E' },
    { value: dist.missed, color: '#EE7B7B' },
  ];

  let offset = 0;
  const arcs = segments
    .map((segment) => {
      const ratio = segment.value / total;
      const len = ratio * circumference;
      const item = `
        <circle
          cx="${cx}"
          cy="${cy}"
          r="${radius}"
          stroke="${segment.color}"
          stroke-width="${stroke}"
          fill="none"
          stroke-linecap="butt"
          stroke-dasharray="${len} ${Math.max(0, circumference - len)}"
          stroke-dashoffset="-${offset}"
          transform="rotate(-90 ${cx} ${cy})"
        />
      `;
      offset += len;
      return item;
    })
    .join('');

  const adherence = Math.round((dist.taken / total) * 100);

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${radius}" stroke="#E8EEF7" stroke-width="${stroke}" fill="none"/>
      ${arcs}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="32" font-weight="800" fill="#203A5C">${adherence}%</text>
      <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="11" fill="#6D7F97">Taken ratio</text>
    </svg>
  `;
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
  const {
    medications,
    doseLogs,
    userName,
    userEmail,
    userTimezone,
    dateGenerated,
    period = 7,
    analytics,
    selectedMedicationId,
    appleHealthSummary,
  } = data;

  const activeMeds = medications.filter((m) => !m.paused);
  const selectedMed =
    activeMeds.find((m) => m.id === selectedMedicationId) ??
    activeMeds[0] ??
    medications[0];

  if (!selectedMed) {
    return `
      <html><body style="font-family:Arial;padding:24px"><h2>No medication found</h2><p>Please add at least one medication before generating a report.</p></body></html>
    `;
  }

  const medLabels = getMedicationLabel(selectedMed);
  const medAnalytics = resolveMedAnalytics(selectedMed, analytics, period, doseLogs);
  const timeline = extractMedLogs(selectedMed, doseLogs, period);
  const statusDist = medStatusDistribution(medAnalytics);
  const totalStatus = Math.max(1, statusDist.taken + statusDist.skipped + statusDist.missed);
  const medIconName = pickMedIconName(selectedMed);
  const reportId = `${selectedMed.id}-${format(dateGenerated, 'yyyyMMddHHmm')}`;

  const avgPct = timeline.length
    ? Math.round(timeline.reduce((sum, d) => sum + d.pct, 0) / timeline.length)
    : medAnalytics.adherencePct;

  const bestDay =
    timeline.length > 0
      ? timeline.reduce((best, d) => (d.pct > best.pct ? d : best), timeline[0]!)
      : null;
  const lowDay =
    timeline.length > 0
      ? timeline.reduce((worst, d) => (d.pct < worst.pct ? d : worst), timeline[0]!)
      : null;

  const timelineByDate = new Map(timeline.map((d) => [d.date, d]));
  const calendarData = (() => {
    const anchor = timeline.length ? new Date(timeline[timeline.length - 1]!.date) : new Date();
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const firstOfMonth = new Date(y, m, 1);
    const startWeekDay = firstOfMonth.getDay();
    const gridStart = new Date(y, m, 1 - startWeekDay);
    const weekdayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      .map((day) => `<div class="cal-weekday">${day}</div>`)
      .join('');

    const cells: string[] = [];
    for (let i = 0; i < 42; i++) {
      const current = new Date(gridStart);
      current.setDate(gridStart.getDate() + i);
      const dateStr = format(current, 'yyyy-MM-dd');
      const inMonth = current.getMonth() === m;
      const daily = timelineByDate.get(dateStr);
      const tone = !inMonth
        ? '#F3F6FB'
        : !daily
          ? '#F9FBFF'
          : daily.pct >= 85
            ? '#C5EDD3'
            : daily.pct >= 60
              ? '#FFE8C9'
              : '#FFD4D4';

      cells.push(`
        <div class="cal-cell ${inMonth ? '' : 'cal-out'}" style="background:${tone}">
          <div class="cal-date">${current.getDate()}</div>
          <div class="cal-pct">${daily ? `${daily.pct}%` : ''}</div>
          <div class="cal-mini">${daily ? `${daily.taken}/${daily.total}` : ''}</div>
        </div>
      `);
    }

    return {
      monthLabel: format(anchor, 'MMMM yyyy'),
      weekdayHeaders,
      cells: cells.join(''),
    };
  })();

  const trendBarsHTML = timeline
    .map((d) => {
      const color = d.pct >= 80 ? '#66C6B8' : d.pct >= 50 ? '#8AB7F0' : '#F4A78A';
      return `
        <div class="bar-col">
          <div class="bpct">${d.pct}%</div>
          <div class="bar" style="height:${Math.max(8, Math.round((d.pct / 100) * 110))}px;background:${color}"></div>
          <div class="blbl">${d.weekday}</div>
        </div>
      `;
    })
    .join('');

  const slotRows = Object.entries(medAnalytics.timeSlotStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, stats]) => {
      const pct = stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0;
      return `
        <div class="slot-row">
          <div class="slot-time">${time}</div>
          <div class="slot-track"><div class="slot-fill" style="width:${pct}%"></div></div>
          <div class="slot-value">${stats.taken}/${stats.total}</div>
        </div>
      `;
    })
    .join('');

  const adherenceGaugeSVG = generateRadialGaugeSVG(
    medAnalytics.adherencePct,
    medAnalytics.adherencePct >= 80 ? '#3CBF9A' : medAnalytics.adherencePct >= 50 ? '#4F9FF5' : '#EF7A7A',
    `${period}-day adherence`,
  );
  const statusDonutSVG = generateDonutChartSVG(statusDist);

  const appleHealthBlock = appleHealthSummary
    ? `
      <div class="card">
        <div class="block-title">Apple Health Snapshot (Today)</div>
        <div class="ah-grid">
          <div class="ah-item"><span>Steps</span><strong>${appleHealthSummary.steps}</strong></div>
          <div class="ah-item"><span>Active kcal</span><strong>${appleHealthSummary.activeCalories}</strong></div>
          <div class="ah-item"><span>Sleep h</span><strong>${appleHealthSummary.sleepHours}</strong></div>
        </div>
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #F4F6FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #202A3A; }
  .page { width: 100%; min-height: 100vh; padding: 28px 28px 18px; background: linear-gradient(160deg, #FFFFFF 0%, #F6FAFF 100%); page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .cover-banner { border-radius: 18px; padding: 20px; color: #F4ED5A; background: radial-gradient(circle at 10% 10%, #2C2E36 0%, #07080B 62%); margin-bottom: 16px; }
  .cover-banner h1 { margin: 0; font-size: 36px; line-height: 0.95; letter-spacing: 0.5px; text-transform: uppercase; }
  .cover-banner p { margin: 8px 0 0; color: #E6DA4E; font-size: 11px; }
  .brand { display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; }
  .brand-left { display:flex; align-items:center; gap: 10px; }
  .brand-pill { width: 32px; height: 32px; border-radius: 16px; background: #54A8DF; color: #fff; display:flex; align-items:center; justify-content:center; font-weight: 700; }
  .brand-name { font-size: 17px; font-weight: 700; }
  .small { font-size: 11px; color: #708095; }
  .panel { background: #FFFFFF; border: 1px solid #E3EBF8; border-radius: 16px; box-shadow: 0 6px 24px rgba(44, 76, 133, 0.08); padding: 14px; }
  .title { font-size: 24px; font-weight: 800; margin: 4px 0 4px; }
  .subtitle { font-size: 12px; color: #687B92; margin-bottom: 10px; }
  .profile { display:grid; grid-template-columns: 1.1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .profile-left { border-radius: 14px; background: linear-gradient(160deg, #DFF3FF 0%, #ECF2FF 100%); padding: 12px; min-height: 148px; }
  .profile-right { border-radius: 14px; background: #F7FAFF; padding: 12px; }
  .avatar-wrap { width: 46px; height: 46px; border-radius: 23px; background: #1D3658; color: #fff; display:flex; align-items:center; justify-content:center; font-size: 20px; margin-bottom: 8px; }
  .row { display:flex; align-items:center; justify-content:space-between; gap: 10px; margin-bottom: 6px; }
  .label { font-size: 11px; color: #6A7990; }
  .value { font-size: 13px; font-weight: 700; color: #213650; }
  .stats { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; margin-top: 8px; }
  .stat { border-radius: 12px; padding: 10px 8px; text-align:center; }
  .stat .k { font-size: 22px; font-weight: 800; }
  .stat .t { margin-top: 2px; font-size: 10px; color: #6A7890; }
  .s1{ background:#DDF2FF; } .s2{ background:#E4F8EB; } .s3{ background:#FFF1DE; } .s4{ background:#F0EBFF; }
  .calendar-title { display:flex; align-items:center; justify-content:space-between; margin-top: 10px; margin-bottom: 8px; }
  .calendar-title strong { font-size: 16px; color:#27466A; }
  .calendar-title span { font-size: 11px; color:#67809A; }
  .calendar-weekdays { display:grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; margin-bottom: 6px; }
  .cal-weekday { text-align:center; font-size: 10px; color:#65809D; font-weight: 700; text-transform: uppercase; }
  .calendar { display:grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
  .cal-cell { border-radius: 10px; min-height: 54px; padding: 5px 4px; text-align:center; }
  .cal-cell.cal-out { opacity: 0.5; }
  .cal-date { font-size: 13px; font-weight: 800; color:#244665; }
  .cal-pct { font-size: 10px; font-weight: 700; margin-top: 1px; color:#2B4F73; }
  .cal-mini { font-size: 9px; color: #5B6E84; margin-top: 1px; }
  .section { margin-top: 14px; }
  .section h3 { margin: 0 0 8px; font-size: 17px; }
  .bars { display:flex; align-items:flex-end; gap: 8px; height: 160px; border-radius: 14px; background:#F8FCFF; border:1px solid #E7EFFA; padding: 10px 10px 8px; }
  .bar-col { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:4px; }
  .bar { width: 80%; border-radius: 8px 8px 4px 4px; }
  .bpct { font-size: 10px; font-weight: 700; color:#4A617E; }
  .blbl { font-size: 10px; color:#6C7D92; }
  .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .gauge-wrap { display:flex; align-items:center; justify-content:center; margin-top: 8px; }
  .card { border-radius: 14px; background: #FFFFFF; border: 1px solid #E4EBF7; box-shadow: 0 5px 18px rgba(76, 108, 160, 0.08); padding: 12px; }
  .card.muted { background: #F8FAFD; }
  .block-title { font-size: 12px; text-transform: uppercase; color:#6A7A90; margin-bottom: 8px; letter-spacing: 0.3px; }
  .dist-track { display:flex; height: 14px; border-radius: 7px; overflow: hidden; background: #E8EEF7; margin-bottom: 8px; }
  .dotline { display:flex; align-items:center; gap:6px; font-size: 11px; color:#4E6079; margin-bottom: 4px; }
  .dot { width: 9px; height: 9px; border-radius: 4.5px; display:inline-block; }
  .donut-wrap { display:flex; align-items:center; justify-content:center; margin-bottom: 8px; }
  .slot-row { display:grid; grid-template-columns: 54px 1fr 42px; align-items:center; gap: 8px; margin-bottom: 6px; }
  .slot-time { font-size: 11px; color:#526680; }
  .slot-track { height: 8px; border-radius: 4px; background:#EAF0FA; overflow:hidden; }
  .slot-fill { height:100%; border-radius: 4px; background: linear-gradient(90deg,#77D7CF,#89B8F0); }
  .slot-value { font-size: 11px; font-weight: 700; color:#2A4262; text-align:right; }
  .ah-grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:8px; }
  .ah-item { border-radius: 10px; background:#F1F8FF; padding: 8px; text-align:center; }
  .ah-item span { display:block; font-size: 10px; color:#6C7F97; }
  .ah-item strong { display:block; margin-top: 2px; font-size: 16px; color:#1D3658; }
  .muted-text { font-size: 12px; color:#7B8CA0; }
  .footer { margin-top: 12px; border-top: 1px dashed #CFE0F6; padding-top: 8px; font-size: 10px; color:#708199; text-align:center; }
</style>
</head>
<body>

<div class="page">
  <div class="cover-banner">
    <h1>Medication<br/>Analytics Report</h1>
    <p>Data from ${format(subDays(dateGenerated, period - 1), 'MMMM d, yyyy')} - ${format(dateGenerated, 'MMMM d, yyyy')}</p>
  </div>

  <div class="brand">
    <div class="brand-left">
      <div class="brand-pill">M</div>
      <div>
        <div class="brand-name">MedMates</div>
        <div class="small">Medication-specific report</div>
      </div>
    </div>
    <div class="small">Report ID: ${reportId}</div>
  </div>

  <div class="panel">
    <div class="title">Patient Summary</div>
    <div class="subtitle">Medication profile and identity details</div>

    <div class="profile">
      <div class="profile-left">
        <div class="avatar-wrap">${medIconName === 'pill.fill' ? '💊' : '✚'}</div>
        <div class="row"><span class="label">Patient</span><span class="value">${userName}</span></div>
        <div class="row"><span class="label">Email</span><span class="value">${userEmail ?? 'Not provided'}</span></div>
        <div class="row"><span class="label">Timezone</span><span class="value">${userTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div>
        <div class="row"><span class="label">Generated</span><span class="value">${format(dateGenerated, 'MMM d, yyyy h:mm a')}</span></div>
        <div class="gauge-wrap">${adherenceGaugeSVG}</div>
      </div>
      <div class="profile-right">
        <div class="row"><span class="label">Medication</span><span class="value">${selectedMed.name}</span></div>
        <div class="row"><span class="label">Dose</span><span class="value">${selectedMed.dosage} ${selectedMed.unit}</span></div>
        <div class="row"><span class="label">Frequency</span><span class="value">${medLabels.frequencyLabel}</span></div>
        <div class="row"><span class="label">Route</span><span class="value">${medLabels.routeLabel}</span></div>
        <div class="row"><span class="label">Meal relation</span><span class="value">${medLabels.mealLabel}</span></div>
        <div class="row"><span class="label">Reminders</span><span class="value">${selectedMed.reminderEnabled ? 'Enabled' : 'Disabled'}</span></div>
      </div>
    </div>

    <div class="stats">
      <div class="stat s1"><div class="k">${medAnalytics.adherencePct}%</div><div class="t">Adherence</div></div>
      <div class="stat s2"><div class="k">${medAnalytics.takenCount}</div><div class="t">Taken</div></div>
      <div class="stat s3"><div class="k">${medAnalytics.currentStreak}</div><div class="t">Current streak</div></div>
      <div class="stat s4"><div class="k">${medAnalytics.bestStreak}</div><div class="t">Best streak</div></div>
    </div>
  </div>

  <div class="footer">Generated by MedMates · Personal medication report · Not medical advice</div>
</div>

<div class="page">
  <div class="brand">
    <div class="brand-left">
      <div class="brand-pill">M</div>
      <div>
        <div class="brand-name">Adherence Calendar</div>
        <div class="small">${selectedMed.name} · ${period}-day timeline</div>
      </div>
    </div>
    <div class="small">Avg: ${avgPct}%</div>
  </div>

  <div class="panel">
    <div class="calendar-title">
      <strong>${calendarData.monthLabel}</strong>
      <span>Direct calendar adherence map</span>
    </div>
    <div class="calendar-weekdays">${calendarData.weekdayHeaders}</div>
    <div class="calendar">${calendarData.cells}</div>

    <div class="section">
      <h3>Adherence Trend</h3>
      <div class="bars">${trendBarsHTML}</div>
    </div>
  </div>

  <div class="grid2 section">
    <div class="card">
      <div class="block-title">Clinical Notes</div>
      <div class="row"><span class="label">Best day</span><span class="value">${bestDay ? `${bestDay.weekday} (${bestDay.pct}%)` : 'N/A'}</span></div>
      <div class="row"><span class="label">Lowest day</span><span class="value">${lowDay ? `${lowDay.weekday} (${lowDay.pct}%)` : 'N/A'}</span></div>
      <div class="row"><span class="label">Total scheduled</span><span class="value">${medAnalytics.totalScheduled}</span></div>
      <div class="row"><span class="label">Total missed</span><span class="value">${medAnalytics.missedCount}</span></div>
    </div>

    <div class="card">
      <div class="block-title">Medication Summary</div>
      <div class="row"><span class="label">Name</span><span class="value">${selectedMed.name}</span></div>
      <div class="row"><span class="label">Dose slots/day</span><span class="value">${selectedMed.schedule.times.length}</span></div>
      <div class="row"><span class="label">Form</span><span class="value">${selectedMed.form ?? 'Not set'}</span></div>
      <div class="row"><span class="label">Last taken</span><span class="value">${medAnalytics.lastTakenDate ?? 'No logs'}</span></div>
    </div>
  </div>

  <div class="footer">Calendar heat scale: green good, amber moderate, red needs attention</div>
</div>

<div class="page">
  <div class="brand">
    <div class="brand-left">
      <div class="brand-pill">M</div>
      <div>
        <div class="brand-name">Insights & Distribution</div>
        <div class="small">Status splits, time slots, and Apple Health context</div>
      </div>
    </div>
    <div class="small">${selectedMed.name}</div>
  </div>

  <div class="grid2">
    <div class="card">
      <div class="block-title">Dose Status Distribution</div>
      <div class="donut-wrap">${statusDonutSVG}</div>
      <div class="dist-track">
        <div style="width:${Math.round((statusDist.taken / totalStatus) * 100)}%;background:#6BCB8C"></div>
        <div style="width:${Math.round((statusDist.skipped / totalStatus) * 100)}%;background:#F2B56E"></div>
        <div style="width:${Math.round((statusDist.missed / totalStatus) * 100)}%;background:#EE7B7B"></div>
      </div>
      <div class="dotline"><span class="dot" style="background:#6BCB8C"></span>Taken: ${statusDist.taken}</div>
      <div class="dotline"><span class="dot" style="background:#F2B56E"></span>Skipped: ${statusDist.skipped}</div>
      <div class="dotline"><span class="dot" style="background:#EE7B7B"></span>Missed: ${statusDist.missed}</div>
    </div>

    <div class="card">
      <div class="block-title">Time-of-day Performance</div>
      ${slotRows || '<div class="muted-text">No time-slot schedule available.</div>'}
    </div>
  </div>

  <div class="section">
    ${appleHealthBlock}
  </div>

  <div class="card section">
    <div class="block-title">Interpretation</div>
    <div class="muted-text">
      ${medAnalytics.adherencePct >= 80
        ? 'Adherence is stable and strong. Continue current reminder cadence.'
        : medAnalytics.adherencePct >= 50
          ? 'Adherence is moderate. Consider refining reminder timing around the lowest-performing slots.'
          : 'Adherence is low. A schedule review and support intervention is recommended.'}
    </div>
  </div>

  <div class="footer">Generated at ${format(dateGenerated, 'MMMM d, yyyy h:mm a')} · ${period}-day medication-specific PDF</div>
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
  const selectedMed = data.medications.find((m) => m.id === data.selectedMedicationId);
  const safeMedName = (selectedMed?.name ?? 'Medication')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 32);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const todayStamp = format(data.dateGenerated ?? new Date(), 'yyyy-MM-dd');

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `${safeMedName} ${todayStamp}`,
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
