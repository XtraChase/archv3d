// archv3d Control: tabs for the stream (Overview), Visitors, Messages and Settings, over the main process's API.
import { useCallback, useEffect, useState } from 'react';
import { api, errorText, type ActionEvent, type ActionName, type Insights, type Settings, type Status } from './api';
import { ago } from './format';
import { Leads } from './Leads';
import { Overview } from './Overview';
import { SettingsView } from './SettingsView';
import { Visitors } from './Visitors';

type Tab = 'overview' | 'visitors' | 'leads' | 'settings';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'visitors', label: 'Visitors' },
  { id: 'leads', label: 'Messages' },
  { id: 'settings', label: 'Settings' }
];

export function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [status, setStatus] = useState<Status | null>(null);
  const [action, setAction] = useState<ActionEvent | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [days, setDays] = useState(30);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsError, setInsightsError] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    api.getStatus().then((value) => value && setStatus(value));
    api.getSettings().then(setSettings);
    const offStatus = api.onStatus(setStatus);
    const offAction = api.onAction(setAction);
    const offNavigate = api.onNavigate((value) => setTab(value as Tab));
    return () => {
      offStatus();
      offAction();
      offNavigate();
    };
  }, []);

  const loadInsights = useCallback(async () => {
    setLoadingInsights(true);
    try {
      setInsights(await api.getInsights(days));
      setInsightsError('');
    } catch (error) {
      setInsightsError(errorText(error));
    } finally {
      setLoadingInsights(false);
    }
  }, [days]);

  // Insights when their tabs open, on a range change, and every 5 minutes while open.
  useEffect(() => {
    if (tab !== 'visitors' && tab !== 'leads') return;
    loadInsights();
    const timer = setInterval(loadInsights, 5 * 60000);
    return () => clearInterval(timer);
  }, [tab, loadInsights, settings?.hasAdminToken]);

  // An action's result banner fades after a while.
  useEffect(() => {
    if (!action || action.state === 'running') return;
    const timer = setTimeout(() => setAction(null), action.state === 'error' ? 15000 : 6000);
    return () => clearTimeout(timer);
  }, [action]);

  async function run(name: ActionName) {
    try {
      await api.runAction(name);
    } catch {
      // The main process reports the error through onAction.
    }
  }

  async function refresh() {
    setRefreshing(true);
    const value = await api.refreshStatus();
    if (value) setStatus(value);
    setRefreshing(false);
  }

  const key = status?.overall.key ?? 'unknown';
  const newLeads = insights?.leads.length ?? 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">archv3d</span>
          <span className="brand-sub">Control</span>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((item) => (
            <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
              {item.label}
              {item.id === 'leads' && newLeads > 0 && <span className="count">{newLeads}</span>}
            </button>
          ))}
        </nav>
        <div className="status-pill" title={status ? `Checked ${ago(status.checkedAt)}` : ''}>
          <span className={`dot dot-${key}`} aria-hidden="true" />
          <span>{status?.overall.label ?? 'Checking…'}</span>
          <button className="icon-button" onClick={refresh} disabled={refreshing} aria-label="Check now" title="Check now">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className={refreshing ? 'spin' : ''}>
              <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      {action && (
        <p className={`banner ${action.state === 'error' ? 'banner-error' : action.state === 'done' ? 'banner-done' : ''}`} role="status">
          {action.state === 'running' && `${action.label}…`}
          {action.state === 'done' && `${action.label}: done. The status updates in a moment.`}
          {action.state === 'error' && `${action.label} failed: ${action.error}`}
        </p>
      )}

      <main className="content">
        {tab === 'overview' && (
          <Overview
            status={status}
            running={action?.state === 'running' ? action.name : null}
            hasToken={Boolean(settings?.hasAdminToken)}
            onAction={run}
            onSettings={() => setTab('settings')}
          />
        )}
        {tab === 'visitors' && (
          <Visitors
            data={insights}
            error={insightsError}
            loading={loadingInsights}
            days={days}
            onDays={setDays}
            onRefresh={loadInsights}
            onSettings={() => setTab('settings')}
          />
        )}
        {tab === 'leads' && (
          <Leads
            leads={insights?.leads ?? null}
            error={insightsError}
            onDeleted={(id) => insights && setInsights({ ...insights, leads: insights.leads.filter((lead) => lead.id !== id) })}
          />
        )}
        {tab === 'settings' && <SettingsView onSaved={setSettings} />}
      </main>
    </div>
  );
}
