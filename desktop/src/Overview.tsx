// Overview: the website, the live experience, the cloud machine, the stream on this PC and this month's AWS costs.
import { useEffect, useState } from 'react';
import { api, errorText, type ActionName, type Costs, type Status } from './api';
import { ago, duration, money } from './format';

interface Props {
  status: Status | null;
  running: ActionName | null;
  hasToken: boolean;
  onAction: (name: ActionName) => void;
  onSettings: () => void;
}

const CLOUD_LABEL: Record<string, string> = {
  off: 'Off',
  asleep: 'Asleep',
  starting: 'Starting',
  running: 'Running',
  error: 'Unreachable'
};

export function Overview({ status, running, hasToken, onAction, onSettings }: Props) {
  const [costs, setCosts] = useState<Costs | null>(null);
  const [costError, setCostError] = useState('');
  const [loadingCosts, setLoadingCosts] = useState(false);

  async function loadCosts(fresh = false) {
    if (!hasToken) return;
    setLoadingCosts(true);
    try {
      setCosts(await api.getCosts(fresh));
      setCostError('');
    } catch (error) {
      setCostError(errorText(error));
    } finally {
      setLoadingCosts(false);
    }
  }

  useEffect(() => {
    loadCosts();
  }, [hasToken]);

  if (!status) return <p className="empty">Checking the site…</p>;
  const { site, stream, cloud, local } = status;
  const instance = cloud.instance;
  const cloudAllowed = instance ? instance.wake === 'on' : cloud.status !== 'off' && cloud.status !== 'error';
  const busy = running !== null;

  return (
    <div className="grid-cards">
      <section className="panel card">
        <p className="kicker">Website</p>
        <h3 className={site.up ? 'good' : 'bad'}>{site.up ? 'Online' : 'Down'}</h3>
        <dl className="facts">
          <dt>Response</dt>
          <dd>{site.ms !== null ? `${site.ms} ms` : site.error ?? '—'}</dd>
          {site.code !== undefined && (
            <>
              <dt>HTTP</dt>
              <dd>{site.code}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="panel card">
        <p className="kicker">Live experience</p>
        <h3>{status.overall.label}</h3>
        <dl className="facts">
          <dt>Served by</dt>
          <dd>{status.servedBy === 'cloud' ? 'Cloud machine' : status.servedBy === 'local' ? 'This PC' : stream.reachable ? 'Unknown' : 'Nobody'}</dd>
          {stream.reachable && (
            <>
              <dt>Visitor connected</dt>
              <dd>{stream.busy ? 'Yes' : 'No'}</dd>
              <dt>Waiting in line</dt>
              <dd>{stream.waiting ?? 0}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="panel card">
        <p className="kicker">Cloud machine (AWS)</p>
        <h3>{CLOUD_LABEL[cloud.status] ?? cloud.status}</h3>
        <dl className="facts">
          {instance ? (
            <>
              <dt>Machine</dt>
              <dd>
                {instance.type} · {instance.state}
              </dd>
              {instance.state === 'running' && (
                <>
                  <dt>Up for</dt>
                  <dd>{duration(instance.launchTime)}</dd>
                </>
              )}
              <dt>Wakes for visitors</dt>
              <dd>{instance.wake === 'on' ? 'Yes' : 'No'}</dd>
            </>
          ) : (
            <>
              <dt>Wakes for visitors</dt>
              <dd>{cloud.status === 'off' ? 'No' : cloud.status === 'error' ? '—' : 'Yes'}</dd>
            </>
          )}
        </dl>
        <p className="note">Billed by the hour while running. It shuts itself down after 15 minutes without visitors.</p>
        <div className="actions">
          {hasToken ? (
            cloudAllowed ? (
              <button className="button" disabled={busy} onClick={() => onAction('cloudOff')}>
                {running === 'cloudOff' ? 'Turning off…' : 'Turn off'}
              </button>
            ) : (
              <button className="button button-primary" disabled={busy} onClick={() => onAction('cloudOn')}>
                {running === 'cloudOn' ? 'Turning on…' : 'Turn on'}
              </button>
            )
          ) : (
            <button className="button" onClick={onSettings}>
              Add admin token
            </button>
          )}
        </div>
      </section>

      <section className="panel card">
        <p className="kicker">This PC</p>
        <h3>{local.running ? (stream.reachable && status.servedBy === 'local' ? 'Streaming' : 'Running') : 'Stopped'}</h3>
        <dl className="facts">
          <dt>Experience</dt>
          <dd>{local.game ? 'Running' : 'Not running'}</dd>
          <dt>Cloudflare tunnel</dt>
          <dd>{local.tunnel ? 'Connected' : 'Not running'}</dd>
        </dl>
        <p className="note">Starting here turns the cloud machine off; the two share the same address.</p>
        <div className="actions">
          {local.running ? (
            <button className="button" disabled={busy} onClick={() => onAction('localStop')}>
              {running === 'localStop' ? 'Stopping…' : 'Stop'}
            </button>
          ) : (
            <button className="button button-primary" disabled={busy} onClick={() => onAction('localStart')}>
              {running === 'localStart' ? 'Starting…' : 'Start'}
            </button>
          )}
        </div>
      </section>

      <section className="panel card card-wide">
        <header className="panel-head">
          <div>
            <p className="kicker">AWS costs this month</p>
            <h3>{costs ? money(costs.monthToDate, costs.currency) : hasToken ? (costError ? 'Unavailable' : '…') : '—'}</h3>
          </div>
          {hasToken && (
            <button className="link-button" disabled={loadingCosts} onClick={() => loadCosts(true)}>
              {loadingCosts ? 'Loading…' : 'Refresh'}
            </button>
          )}
        </header>
        {!hasToken && <p className="note">Add the admin token in Settings to see costs.</p>}
        {costError && <p className="note bad">{costError}</p>}
        {costs && (
          <>
            <ul className="rank-list">
              {costs.byService
                .filter((row) => row.amount >= 0.005)
                .slice(0, 6)
                .map((row) => (
                  <li key={row.service}>
                    <span>{row.service}</span>
                    <span className="num">{money(row.amount, costs.currency)}</span>
                  </li>
                ))}
            </ul>
            <p className="note">
              {costs.from} to {costs.to} · updated {ago(costs.cachedAt)}. AWS reports costs with a delay of up to a day; each refresh costs $0.01.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
