// Leads: messages sent through the site's contact form, with the network and place they came from.
import { useState } from 'react';
import { api, errorText, type Lead } from './api';
import { dateTime, place } from './format';

interface Props {
  leads: Lead[] | null;
  error: string;
  onDeleted: (id: number) => void;
}

export function Leads({ leads, error, onDeleted }: Props) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');

  async function remove(id: number) {
    try {
      await api.deleteLead(id);
      setConfirming(null);
      onDeleted(id);
    } catch (problem) {
      setDeleteError(errorText(problem));
    }
  }

  if (!leads) return <div className="empty">{error ? <p>{error}</p> : <p>Loading messages…</p>}</div>;
  if (leads.length === 0)
    return (
      <div className="empty">
        <p>No messages in this period yet.</p>
        <p className="note">Messages from the site's contact form show up here, and as a Windows notification when they arrive.</p>
      </div>
    );

  return (
    <div className="lead-list">
      {deleteError && <p className="banner banner-error">{deleteError}</p>}
      {leads.map((lead) => {
        const subject = `Re: ${lead.topic}`;
        return (
          <article key={lead.id} className="panel lead">
            <header className="lead-head">
              <div>
                <h3>{lead.name}</h3>
                <p className="muted small">
                  {lead.email} · {lead.topic}
                </p>
              </div>
              <span className="muted small">{dateTime(lead.ts)}</span>
            </header>
            <p className="lead-message">{lead.message}</p>
            <p className="note">
              {[lead.org, place(lead.city, lead.region, lead.country)].filter(Boolean).join(' · ')}
            </p>
            <div className="actions">
              <button
                className="button button-primary"
                onClick={() => api.openExternal(`mailto:${lead.email}?subject=${encodeURIComponent(subject)}`)}
              >
                Reply by email
              </button>
              {confirming === lead.id ? (
                <>
                  <button className="button button-danger" onClick={() => remove(lead.id)}>
                    Delete for good
                  </button>
                  <button className="link-button" onClick={() => setConfirming(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <button className="link-button" onClick={() => setConfirming(lead.id)}>
                  Delete
                </button>
              )}
            </div>
          </article>
        );
      })}
      <p className="note footnote">Delete a message when the sender asks you to; the privacy page promises it.</p>
    </div>
  );
}
