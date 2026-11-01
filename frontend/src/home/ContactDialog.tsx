// Contact form in a dialog. Posts to the contact Worker (contact/ in the repo, URL in config.js contactUrl), which
// emails it to Chase. If sending fails, the visitor gets the email address instead.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { settings, track } from '../site';
import { profile } from './profile';
import { ArrowIcon, CloseIcon } from './icons';

const TOPICS = ['Project inquiry', 'Architectural visualization', 'Live experience feedback', 'Other'];

type SendState = { phase: 'editing' | 'sending' } | { phase: 'sent'; name: string } | { phase: 'error'; message: string };

export function ContactDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  // When the form was opened; the Worker rejects forms sent faster than a person could fill them in.
  const openedAt = useRef(Date.now());
  const [state, setState] = useState<SendState>({ phase: 'editing' });

  useEffect(() => track('contact_open'), []);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    firstField.current?.focus();
    document.body.classList.add('no-scroll');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'Tab') trapFocus(event);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      previousFocus?.focus({ preventScroll: true });
    };
  }, [onClose]);

  function trapFocus(event: KeyboardEvent) {
    const focusable = dialog.current?.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    if (!settings.contactUrl) {
      setState({ phase: 'error', message: 'The contact form isn’t set up yet.' });
      return;
    }
    setState({ phase: 'sending' });
    try {
      const response = await fetch(settings.contactUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, openedAt: openedAt.current })
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (response.ok && result.ok) {
        setState({ phase: 'sent', name: data.name.trim().split(/\s+/)[0] });
        track('contact_sent', { detail: data.topic });
      }
      else setState({ phase: 'error', message: result.error ?? 'The message could not be sent right now.' });
    } catch {
      setState({ phase: 'error', message: 'The message could not be sent right now.' });
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialog} className="dialog" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button className="dialog-close" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>

        {state.phase === 'sent' ? (
          <div className="contact-sent" role="status">
            <p className="kicker">Message sent</p>
            <h2 id="contact-title" className="dialog-title">
              Thanks, {state.name}.
            </h2>
            <p className="muted">Your message is on its way. I’ll get back to you by email soon.</p>
            <button className="button button-primary" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <p className="kicker">Contact</p>
            <h2 id="contact-title" className="dialog-title">
              Let’s talk about your project
            </h2>
            <p className="muted dialog-lede">
              Architectural visualization, interactive walkthroughs or a question about the work. I usually reply within
              a couple of days.
            </p>

            <form className="contact-form" onSubmit={submit}>
              <div className="field-row">
                <label className="field">
                  <span>Name</span>
                  <input ref={firstField} name="name" autoComplete="name" required maxLength={100} />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input name="email" type="email" autoComplete="email" required maxLength={200} />
                </label>
              </div>
              <label className="field">
                <span>Topic</span>
                <select name="topic" defaultValue={TOPICS[0]}>
                  {TOPICS.map((topic) => (
                    <option key={topic}>{topic}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Message</span>
                <textarea name="message" rows={6} required minLength={10} maxLength={5000} />
              </label>
              {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
              <label className="field-trap" aria-hidden="true">
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>

              {state.phase === 'error' && (
                <p className="form-error" role="alert">
                  {state.message} You can also email{' '}
                  <a href={`mailto:${profile.email}`}>{profile.email}</a>.
                </p>
              )}

              <div className="form-actions">
                <button className="button button-primary" type="submit" disabled={state.phase === 'sending'}>
                  {state.phase === 'sending' ? 'Sending…' : 'Send message'} <ArrowIcon />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
