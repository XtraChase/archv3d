// Settings: the admin token shared with the control Worker, where the project lives, notifications, start with Windows.
import { useEffect, useState } from 'react';
import { api, errorText, type Settings } from './api';

type Check = { state: 'checking' } | { state: 'ok' } | { state: 'error'; text: string };

export function SettingsView({ onSaved }: { onSaved: (settings: Settings) => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  // The token being entered or just generated; a saved token is never shown again.
  const [token, setToken] = useState('');
  const [generated, setGenerated] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [copied, setCopied] = useState(false);
  const [check, setCheck] = useState<Check | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  async function checkToken() {
    setCheck({ state: 'checking' });
    const result = await api.testToken();
    setCheck(result.ok ? { state: 'ok' } : { state: 'error', text: result.error ?? 'Not accepted.' });
  }

  useEffect(() => {
    api.getSettings().then((value) => {
      setSettings(value);
      if (value.hasAdminToken) checkToken();
    });
  }, []);

  if (!settings) return <p className="empty">Loading…</p>;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings({ ...settings, [key]: value });

  async function save(changes: Partial<Settings> & { adminToken?: string }, done: string) {
    try {
      const saved = await api.saveSettings(changes);
      setSettings(saved);
      onSaved(saved);
      setMessage({ text: done });
      return saved;
    } catch (error) {
      setMessage({ text: errorText(error), error: true });
      return null;
    }
  }

  // A generated token is saved here at once; it only has to be copied into Cloudflare.
  async function generate() {
    const fresh = await api.generateToken();
    setToken(fresh);
    setGenerated(true);
    setCopied(false);
    setCheck(null);
    await save({ adminToken: fresh }, 'New token saved on this PC. Copy it into Cloudflare as ADMIN_TOKEN.');
  }

  async function savePasted() {
    if (await save({ adminToken: token }, 'Admin token saved on this PC.')) {
      setToken('');
      setReplacing(false);
      checkToken();
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
  }

  function finishGenerated() {
    setToken('');
    setGenerated(false);
    setReplacing(false);
    setMessage(null);
    checkToken();
  }

  const editing = !settings.hasAdminToken || replacing || generated;

  return (
    <div className="settings">
      {message && <p className={`banner ${message.error ? 'banner-error' : ''}`}>{message.text}</p>}

      <section className="panel">
        <h3 className="panel-title">Admin token</h3>
        <p className="note">
          The app and the control Worker share a secret token. It unlocks visitor insights, messages, costs and turning the cloud machine on and
          off. It's stored encrypted for your Windows account and never shown again after it's saved.
        </p>

        {!editing && (
          <>
            <dl className="facts token-facts">
              <dt>On this PC</dt>
              <dd className="good">Saved</dd>
              <dt>Cloudflare</dt>
              <dd className={check?.state === 'ok' ? 'good' : check?.state === 'error' ? 'bad' : ''}>
                {check?.state === 'ok' ? 'Accepted by the control Worker' : check?.state === 'error' ? check.text : 'Checking…'}
              </dd>
            </dl>
            <div className="actions">
              <button className="button" onClick={checkToken} disabled={check?.state === 'checking'}>
                Check again
              </button>
              <button className="button" onClick={() => setReplacing(true)}>
                Replace token
              </button>
              {confirmRemove ? (
                <>
                  <button
                    className="button button-danger"
                    onClick={async () => {
                      await save({ adminToken: '' }, 'Admin token removed from this PC.');
                      setConfirmRemove(false);
                      setCheck(null);
                    }}
                  >
                    Remove for good
                  </button>
                  <button className="link-button" onClick={() => setConfirmRemove(false)}>
                    Keep
                  </button>
                </>
              ) : (
                <button className="link-button" onClick={() => setConfirmRemove(true)}>
                  Remove from this PC
                </button>
              )}
            </div>
          </>
        )}

        {editing && generated && (
          <>
            <p>
              <strong className="good">Saved on this PC.</strong> Now copy it into Cloudflare:
            </p>
            <div className="field-row">
              <input className="input mono" readOnly value={token} onFocus={(event) => event.target.select()} />
              <button className="button button-primary" onClick={copy}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="note">
              In the Cloudflare dashboard open <strong>Workers &amp; Pages › archv3d-control › Settings › Variables and Secrets</strong>. Add
              the secret <code>ADMIN_TOKEN</code> (or edit it and choose Rotate), paste the token as the value and <strong>Deploy</strong>.
            </p>
            <div className="actions">
              <button className="button" onClick={finishGenerated}>
                Done, it's in Cloudflare
              </button>
            </div>
          </>
        )}

        {editing && !generated && (
          <>
            <p>
              <button className="button" onClick={generate}>
                Generate a new token
              </button>{' '}
              <span className="muted">or paste the one already in Cloudflare:</span>
            </p>
            <div className="field-row">
              <input
                className="input mono"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste the admin token"
                spellCheck={false}
                autoComplete="off"
              />
              <button className="button button-primary" disabled={!token.trim()} onClick={savePasted}>
                Save token
              </button>
            </div>
            {replacing && (
              <button
                className="link-button"
                onClick={() => {
                  setReplacing(false);
                  setToken('');
                }}
              >
                Cancel, keep the saved token
              </button>
            )}
          </>
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
