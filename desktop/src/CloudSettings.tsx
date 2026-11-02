// Cloud settings: when the cloud machine turns itself off and how long a visitor's session may last. Stored as tags on
// the instance by the control Worker and read live by the gateway on the machine (servers/gateway.mjs).
import { useEffect, useState } from 'react';
import { api, errorText, type CloudSettings } from './api';

const FIELDS: { key: keyof CloudSettings; label: string; help: string; min: number; max: number }[] = [
  {
    key: 'idleShutdownMinutes',
    label: 'Turn the machine off after',
    help: 'Minutes with nobody streaming or waiting. 0 keeps it running until you turn it off, and AWS bills it by the hour.',
    min: 0,
    max: 1440
  },
  {
    key: 'idleAloneMinutes',
    label: 'Disconnect a visitor who does nothing for',
    help: 'Minutes without mouse, touch or keyboard input, when nobody is waiting.',
    min: 1,
    max: 240
  },
  {
    key: 'idleWaitingMinutes',
    label: '…or, when someone is waiting, for',
    help: 'The same, but shorter so the next visitor gets a turn.',
    min: 1,
    max: 60
  },
  {
    key: 'sessionMinutes',
    label: 'Session length when someone is waiting',
    help: 'A visitor alone can stay as long as they stay active.',
    min: 1,
    max: 120
  }
];

export function CloudSettingsPanel() {
  const [saved, setSaved] = useState<CloudSettings | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const show = (settings: CloudSettings) => {
    setSaved(settings);
    setValues(Object.fromEntries(FIELDS.map((field) => [field.key, String(settings[field.key])])));
  };

  useEffect(() => {
    api.getCloudSettings().then(show, (error) => setLoadError(errorText(error)));
  }, []);

  const invalid = FIELDS.find((field) => {
    const value = Number(values[field.key]);
    return !Number.isInteger(value) || value < field.min || value > field.max;
  });
  const changed = saved !== null && FIELDS.some((field) => values[field.key] !== String(saved[field.key]));

  async function save() {
    if (!saved) return;
    setSaving(true);
    setMessage(null);
    try {
      const changes = Object.fromEntries(FIELDS.filter((field) => values[field.key] !== String(saved[field.key])).map((field) => [field.key, Number(values[field.key])]));
      show(await api.saveCloudSettings(changes));
      setMessage({ text: 'Saved. A running cloud machine picks it up within a minute.' });
    } catch (error) {
      setMessage({ text: errorText(error), error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <h3 className="panel-title">Cloud settings</h3>
      {loadError && <p className="banner banner-error">{loadError}</p>}
      {!saved && !loadError && <p className="muted">Loading…</p>}
      {saved && (
        <>
          {FIELDS.map((field) => (
            <label className="field" key={field.key}>
              <span>{field.label}</span>
              <span className="unit-row">
                <input
                  className="input num-input"
                  type="number"
                  inputMode="numeric"
                  min={field.min}
                  max={field.max}
                  value={values[field.key] ?? ''}
                  onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                />
                <span className="muted">minutes</span>
              </span>
              <span className="footnote">{field.help}</span>
            </label>
          ))}
          {saved.idleShutdownMinutes === 0 && Number(values.idleShutdownMinutes) === 0 && (
            <p className="banner banner-error">The machine won't turn itself off: it keeps billing until you turn it off here.</p>
          )}
          {invalid && <p className="note bad">{invalid.label}: a whole number from {invalid.min} to {invalid.max}.</p>}
          {message && <p className={`banner ${message.error ? 'banner-error' : ''}`}>{message.text}</p>}
          <div className="actions">
            <button className="button button-primary" disabled={!changed || Boolean(invalid) || saving} onClick={save}>
              {saving ? 'Saving…' : 'Save cloud settings'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
