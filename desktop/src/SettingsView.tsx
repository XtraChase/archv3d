// Settings: the admin token shared with the control Worker, where the project lives, notifications, start with Windows.
import { useEffect, useState } from 'react';
import { api, errorText, type Settings } from './api';

export function SettingsView({ onSaved }: { onSaved: (settings: Settings) => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [token, setToken] = useState('');
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  if (!settings) return <p className="empty">Loading…</p>;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings({ ...settings, [key]: value });

  async function save(changes: Partial<Settings> & { adminToken?: string }, done: string) {
    try {
      const saved = await api.saveSettings(changes);
      setSettings(saved);
      onSaved(saved);
      setMessage({ text: done });
    } catch (error) {
      setMessage({ text: errorText(error), error: true });
    }
  }

  // A generated token is saved here at once; it only has to be copied into Cloudflare.
  async function generate() {
    const fresh = await api.generateToken();
    setToken(fresh);
    setGenerated(true);
    setCopied(false);
    await save({ adminToken: fresh }, 'New token saved on this PC. Copy it into Cloudflare as ADMIN_TOKEN.');
  }

  async function copy() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
  }

  return (
    <div className="settings">
      {message && <p className={`banner ${message.error ? 'banner-error' : ''}`}>{message.text}</p>}

      <section className="panel">
        <h3 className="panel-title">Admin token</h3>
        <p className="note">
          The app and the control Worker share a secret token. It unlocks visitor insights, messages, costs and turning the cloud machine on and
          off. It's stored encrypted for your Windows account.
        </p>
        <p>
          Status:{' '}
          <strong className={settings.hasAdminToken ? 'good' : 'bad'}>{settings.hasAdminToken ? 'Set' : 'Not set'}</strong>
        </p>
        <ol className="steps">
          <li>
            <button className="button" onClick={generate}>
              Generate a new token
            </button>{' '}
            (saved here right away) and copy it, or paste the one already in Cloudflare and save it.
          </li>
          <li>
            In the Cloudflare dashboard open <strong>Workers &amp; Pages › archv3d-control › Settings › Variables and Secrets</strong>. Add
            (or edit) the secret <code>ADMIN_TOKEN</code>, paste the token as the value and <strong>Deploy</strong>.
          </li>
        </ol>
        <div className="field-row">
          <input
            className="input mono"
            type={generated ? 'text' : 'password'}
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
              setGenerated(false);
            }}
            placeholder="Admin token"
            spellCheck={false}
            autoComplete="off"
          />
          {generated && (
            <button className="button" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          <button
            className="button button-primary"
            hidden={generated}
            disabled={!token.trim()}
            onClick={async () => {
              await save({ adminToken: token }, 'Admin token saved.');
              setToken('');
              setGenerated(false);
            }}
          >
            Save token
          </button>
        </div>
        {settings.hasAdminToken && (
          <button className="link-button" onClick={() => save({ adminToken: '' }, 'Admin token removed from this PC.')}>
            Remove the token from this PC
          </button>
        )}
      </section>

      <section className="panel">
        <h3 className="panel-title">This app</h3>
        <label className="check">
          <input type="checkbox" checked={settings.startWithWindows} onChange={(event) => set('startWithWindows', event.target.checked)} />
          Start with Windows, in the tray
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.notifyLeads} onChange={(event) => set('notifyLeads', event.target.checked)} />
          Notify me about new contact messages
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.notifyOrganizations}
            onChange={(event) => set('notifyOrganizations', event.target.checked)}
          />
          Notify me when a new organization visits
        </label>

        <label className="field">
          <span>Project folder (holds start_experience.bat and stop_experience.bat)</span>
          <input className="input" value={settings.projectDir} onChange={(event) => set('projectDir', event.target.value)} />
        </label>
        <details>
          <summary>Addresses</summary>
          <label className="field">
            <span>Website</span>
            <input className="input" value={settings.siteUrl} onChange={(event) => set('siteUrl', event.target.value)} />
          </label>
          <label className="field">
            <span>Stream waiting line</span>
            <input className="input" value={settings.queueUrl} onChange={(event) => set('queueUrl', event.target.value)} />
          </label>
          <label className="field">
            <span>Control Worker</span>
            <input className="input" value={settings.controlUrl} onChange={(event) => set('controlUrl', event.target.value)} />
          </label>
        </details>
        <div className="actions">
          <button
            className="button button-primary"
            onClick={() => {
              const { hasAdminToken: _token, ...rest } = settings;
              save(rest, 'Settings saved.');
            }}
          >
            Save settings
          </button>
        </div>
      </section>
    </div>
  );
}
