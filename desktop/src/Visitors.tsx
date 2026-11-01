// Visitors: who came, from where and what they looked at. Organizations come from the network a visitor used
// (Cloudflare's asOrganization); networks that aren't internet providers are often companies, schools or agencies.
import { useState } from 'react';
import type { Insights } from './api';
import { DailyChart } from './DailyChart';
import { ago, countryName, dateTime, list, number, place } from './format';

interface Props {
  data: Insights | null;
  error: string;
  loading: boolean;
  days: number;
  onDays: (days: number) => void;
  onRefresh: () => void;
  onSettings: () => void;
}

const RANGES = [7, 30, 90];

function Ranked({ title, rows, empty = 'Nothing yet.' }: { title: string; rows: { label: string; value: number }[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <section className="panel">
      <h3 className="panel-title">{title}</h3>
      {rows.length === 0 ? (
        <p className="note">{empty}</p>
      ) : (
        <ul className="rank-list">
          {rows.slice(0, 8).map((row) => (
            <li key={row.label}>
              <span className="rank-label" title={row.label}>
                {row.label}
              </span>
              <span className="rank-meter" aria-hidden="true">
                <span style={{ width: `${(row.value / max) * 100}%` }} />
              </span>
              <span className="num">{number(row.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function KindBadge({ kind }: { kind: string }) {
  if (kind === 'organization') return <span className="badge badge-lead">Likely business</span>;
  if (kind === 'provider') return <span className="badge">Internet provider</span>;
  return <span className="badge">Unknown network</span>;
}

export function Visitors({ data, error, loading, days, onDays, onRefresh, onSettings }: Props) {
  const [hideProviders, setHideProviders] = useState(true);

  const toolbar = (
    <div className="toolbar">
      <div className="segmented" role="group" aria-label="Time range">
        {RANGES.map((range) => (
          <button key={range} className={range === days ? 'active' : ''} onClick={() => onDays(range)}>
            {range} days
          </button>
        ))}
      </div>
      <span className="muted small">{data ? `Updated ${ago(data.generatedAt)}` : ''}</span>
      <button className="link-button" disabled={loading} onClick={onRefresh}>
        {loading ? 'Loading…' : 'Refresh'}
      </button>
    </div>
  );

  if (!data) {
    return (
      <>
        {toolbar}
        <div className="empty">
          {error ? (
            <>
              <p>{error}</p>
              {/admin token/i.test(error) && (
                <button className="button button-primary" onClick={onSettings}>
                  Open Settings
                </button>
              )}
            </>
          ) : (
            <p>Loading visitors…</p>
          )}
        </div>
      </>
    );
  }

  const totals = data.totals ?? ({} as NonNullable<Insights['totals']>);
  const orgs = hideProviders ? data.orgs.filter((row) => row.kind !== 'provider') : data.orgs;
  const kpis = [
    { label: 'Visitors', value: totals.visitors, hint: 'Counted once per day' },
    { label: 'Page views', value: totals.pageviews },
    { label: 'Project views', value: totals.projectViews },
    { label: 'Experience sessions', value: totals.experienceSessions, hint: `${number(totals.experienceOpens)} opened the page` },
    { label: 'Messages sent', value: totals.contactsSent, hint: `${number(totals.contactOpens)} opened the form` }
  ];

  return (
    <>
      {toolbar}
      {error && <p className="banner banner-error">{error}</p>}
      <div className="kpis">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi">
            <span className="kpi-label">{kpi.label}</span>
            <span className="kpi-value">{number(kpi.value)}</span>
            {kpi.hint && <span className="kpi-hint">{kpi.hint}</span>}
          </div>
        ))}
      </div>

      <DailyChart daily={data.daily} days={days} />

      <section className="panel">
        <header className="panel-head">
          <div>
            <h3>Organizations</h3>
            <p className="note">
              The network each visitor came from. A company, school or agency network is a likely business lead; home internet and mobile
              providers say little about the person.
            </p>
          </div>
          <label className="check">
            <input type="checkbox" checked={hideProviders} onChange={(event) => setHideProviders(event.target.checked)} />
            Hide internet providers
          </label>
        </header>
        {orgs.length === 0 ? (
          <p className="note">No {hideProviders ? 'organization networks' : 'networks'} in this period yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Network</th>
                  <th>Where</th>
                  <th className="num">Visitors</th>
                  <th className="num">Actions</th>
                  <th className="num">Experience</th>
                  <th className="num">Messaged</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((row) => (
                  <tr key={`${row.org}-${row.asn}`} className={row.kind === 'organization' ? 'row-lead' : ''}>
                    <td>
                      <div className="cell-title">{row.org}</div>
                      <KindBadge kind={row.kind} />
                    </td>
                    <td>{list(row.cities).slice(0, 3).join(', ') || '—'}</td>
                    <td className="num">{number(row.visitors)}</td>
                    <td className="num">{number(row.events)}</td>
                    <td className="num">{number(row.experienceOpens)}</td>
                    <td className="num">{row.contactsSent ? number(row.contactsSent) : '—'}</td>
                    <td>{ago(row.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid-3">
        <Ranked
          title="Places"
          rows={data.places.map((row) => ({ label: place(row.city, row.region, row.country), value: row.visitors }))}
        />
        <Ranked title="Came from" rows={data.referrers.map((row) => ({ label: row.ref, value: row.visitors }))} empty="Direct visits only so far." />
        <Ranked title="Projects viewed" rows={data.projects.map((row) => ({ label: row.project, value: row.views }))} />
        <Ranked title="Pages" rows={data.pages.map((row) => ({ label: row.path, value: row.views }))} />
        <Ranked title="Devices" rows={data.devices.map((row) => ({ label: row.device ?? 'Unknown', value: row.visitors }))} />
        <Ranked
          title="Countries"
          rows={Object.entries(
            data.places.reduce<Record<string, number>>((sum, row) => {
              const name = countryName(row.country) || 'Unknown';
              sum[name] = (sum[name] ?? 0) + row.visitors;
              return sum;
            }, {})
          )
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)}
        />
      </div>

      <section className="panel">
        <h3 className="panel-title">Recent visits</h3>
        {data.visits.length === 0 ? (
          <p className="note">No visits in this period yet.</p>
        ) : (
          <ul className="visit-list">
            {data.visits.slice(0, 60).map((visit) => (
              <li key={`${visit.day}-${visit.visitor}`} className={visit.kind === 'organization' ? 'row-lead' : ''}>
                <div className="visit-head">
                  <strong>{place(visit.city, visit.region, visit.country)}</strong>
                  <span className="muted small">{dateTime(visit.lastTs)}</span>
                </div>
                <div className="visit-meta">
                  {visit.org && (
                    <span>
                      {visit.org} <KindBadge kind={visit.kind} />
                    </span>
                  )}
                  <span className="muted">{[visit.device, visit.browser, visit.os].filter(Boolean).join(' · ')}</span>
                  {visit.ref && <span className="muted">from {visit.ref}</span>}
                </div>
                <div className="visit-tags">
                  <span className="tag">{visit.events} actions</span>
                  {list(visit.projects).map((project) => (
                    <span key={project} className="tag">
                      {project}
                    </span>
                  ))}
                  {visit.sessions > 0 && <span className="tag tag-accent">Explored {list(visit.experiences).join(', ') || 'the experience'}</span>}
                  {visit.contacted > 0 && <span className="tag tag-accent">Sent a message</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="note footnote">
        No cookies and no IP addresses are stored. A visitor is a daily anonymous count, so the same person on two days counts twice. Visitors
        with Global Privacy Control or Do Not Track on, or who opted out on the privacy page, aren't counted. Records are deleted after 13 months.
      </p>
    </>
  );
}
