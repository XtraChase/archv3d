// Visitors per day: one series, thin bars with rounded tops, hover tooltip, and a table view of the same numbers.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Insights } from './api';

const HEIGHT = 200;
const PAD = { top: 12, right: 8, bottom: 26, left: 34 };

/** Every day in the range (UTC, like the Worker's `day` column), zero when nobody came. */
function fillDays(daily: Insights['daily'], days: number) {
  const byDay = new Map(daily.map((row) => [row.day, row]));
  const out: { day: string; visitors: number; pageviews: number }[] = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset)).toISOString().slice(0, 10);
    const row = byDay.get(day);
    out.push({ day, visitors: row?.visitors ?? 0, pageviews: row?.pageviews ?? 0 });
  }
  return out;
}

const label = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

function niceMax(value: number) {
  if (value <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(value));
  for (const factor of [1, 2, 2.5, 5, 10]) if (factor * step >= value) return factor * step;
  return 10 * step;
}

/** A bar with a 4px rounded top and a square base on the baseline. */
function barPath(x: number, y: number, width: number, height: number) {
  const r = Math.min(4, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

export function DailyChart({ daily, days }: { daily: Insights['daily']; days: number }) {
  const rows = useMemo(() => fillDays(daily, days), [daily, days]);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [table]);

  const max = niceMax(Math.max(0, ...rows.map((row) => row.visitors)));
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const slot = plotW / rows.length;
  const barW = Math.max(1, Math.min(18, slot - 2));
  const y = (value: number) => PAD.top + plotH - (value / max) * plotH;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(rows.length / Math.max(2, Math.floor(plotW / 70)));
  const hovered = hover === null ? null : rows[hover];

  return (
    <section className="panel">
      <header className="panel-head">
        <h3>Visitors per day</h3>
        <button className="link-button" onClick={() => setTable(!table)}>
          {table ? 'Show chart' : 'Show table'}
        </button>
      </header>
      {table ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Day</th>
                <th className="num">Visitors</th>
                <th className="num">Page views</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((row) => (
                <tr key={row.day}>
                  <td>{label(row.day)}</td>
                  <td className="num">{row.visitors}</td>
                  <td className="num">{row.pageviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart" ref={box} onMouseLeave={() => setHover(null)}>
          <svg width={width} height={HEIGHT} role="img" aria-label={`Visitors per day over the last ${days} days`}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line className="grid" x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} />
                <text className="axis" x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                  {Number.isInteger(tick) ? tick : tick.toFixed(1)}
                </text>
              </g>
            ))}
            {rows.map((row, index) => {
              const x = PAD.left + index * slot + (slot - barW) / 2;
              const top = y(row.visitors);
              return (
                <g key={row.day}>
                  {row.visitors > 0 && (
                    <path className={`bar${hover === index ? ' bar-hover' : ''}`} d={barPath(x, top, barW, PAD.top + plotH - top)} />
                  )}
                  {index % labelEvery === 0 && (
                    <text className="axis" x={x + barW / 2} y={HEIGHT - 8} textAnchor="middle">
                      {label(row.day)}
                    </text>
                  )}
                  {/* Hit target: the whole column, wider and taller than the bar. */}
                  <rect x={PAD.left + index * slot} y={PAD.top} width={slot} height={plotH} fill="transparent" onMouseEnter={() => setHover(index)} />
                </g>
              );
            })}
          </svg>
          {hovered && hover !== null && (
            <div
              className="tooltip"
              style={{
                left: Math.min(width - 150, Math.max(0, PAD.left + hover * slot + slot / 2 - 70)),
                top: Math.max(0, y(hovered.visitors) - 64)
              }}
            >
              <strong>{label(hovered.day)}</strong>
              <span>
                {hovered.visitors} visitor{hovered.visitors === 1 ? '' : 's'}
              </span>
              <span className="muted">
                {hovered.pageviews} page view{hovered.pageviews === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
