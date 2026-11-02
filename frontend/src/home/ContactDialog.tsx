// Contact form in a dialog. Posts to the contact Worker (contact/ in the repo, URL in config.js contactUrl), which
// emails it to Chase, attachments included. Project inquiries also ask for the project type, services, budget and
// timeline (the Worker accepts only these options). If sending fails, the visitor gets the email address instead.
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { settings, track } from '../site';
import { profile } from './profile';
import { ArrowIcon, CloseIcon } from './icons';

const TOPICS = ['Project inquiry', 'Architectural visualization', 'Live experience feedback', 'Other'];
/** Topics that get the quote questions. */
const QUOTE_TOPICS = ['Project inquiry', 'Architectural visualization'];
const PROJECT_TYPES = ['Residential', 'Commercial', 'Interior', 'Outdoor & landscape', 'Product', 'Other'];
const SERVICES = ['CAD drafting', 'BIM / Revit model', 'Still renderings', 'Animated walkthrough', 'Interactive Unreal tour'];
const BUDGETS = ['Under $1,000', '$1,000 – $5,000', '$5,000 – $15,000', 'Over $15,000', 'Not sure yet'];
const TIMELINES = ['As soon as possible', 'Within a month', '1 – 3 months', 'Flexible'];

// Same limits as the Worker (contact/src/index.ts), checked here first so nothing large is uploaded to be refused.
const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const FILE_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'heic', 'dwg', 'dxf', 'rvt', 'skp', 'ifc', 'zip', 'docx', 'xlsx', 'txt'];

const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;

/** Why these files can't be sent, or null. */
function fileProblem(files: File[]) {
  if (files.length > MAX_FILES) return `Please attach at most ${MAX_FILES} files.`;
  const wrong = files.find((file) => !FILE_EXTENSIONS.includes(file.name.split('.').pop()?.toLowerCase() ?? ''));
  if (wrong) return `${wrong.name} isn’t a file type the form accepts.`;
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
    return 'Attachments can be 10 MB in total. For larger files, put a link in your message.';
  }
  return null;
}

type SendState = { phase: 'editing' | 'sending' } | { phase: 'sent'; name: string } | { phase: 'error'; message: string };

export function ContactDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  // When the form was opened; the Worker rejects forms sent faster than a person could fill them in.
  const openedAt = useRef(Date.now());
  const [state, setState] = useState<SendState>({ phase: 'editing' });
  const [topic, setTopic] = useState(TOPICS[0]);
  const [files, setFiles] = useState<File[]>([]);
  const filesProblem = fileProblem(files);
  const quote = QUOTE_TOPICS.includes(topic);

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    // Picking again adds to the list (same name and size counts as the same file).
    setFiles((current) => [...current, ...picked.filter((file) => !current.some((f) => f.name === file.name && f.size === file.size))]);
    event.target.value = '';
  }

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
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form) as Record<string, string>;
    if (filesProblem) return;
    if (!settings.contactUrl) {
      setState({ phase: 'error', message: 'The contact form isn’t set up yet.' });
      return;
    }
    setState({ phase: 'sending' });
    try {
      // With attachments: multipart. Without: JSON, which every version of the Worker reads (the site and the Worker
      // deploy separately, so a message never depends on which one updated first).
      const attach = quote ? files : [];
      let body: FormData | string;
      if (attach.length) {
        form.delete('files');
        attach.forEach((file) => form.append('files', file));
        form.set('openedAt', String(openedAt.current));
        body = form;
      } else {
        body = JSON.stringify({ ...data, services: form.getAll('services'), openedAt: openedAt.current });
      }
      const response = await fetch(settings.contactUrl, {
        method: 'POST',
        headers: typeof body === 'string' ? { 'Content-Type': 'application/json' } : undefined,
        body
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
                <select name="topic" value={topic} onChange={(event) => setTopic(event.target.value)}>
                  {TOPICS.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>

              {quote && (
                <>
                  <div className="field-row">
                    <label className="field">
                      <span>Project type</span>
                      <select name="projectType" defaultValue="">
                        <option value="">Choose…</option>
                        {PROJECT_TYPES.map((name) => (
                          <option key={name}>{name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Timeline</span>
                      <select name="timeline" defaultValue="">
                        <option value="">Choose…</option>
                        {TIMELINES.map((name) => (
                          <option key={name}>{name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <fieldset className="field field-choices">
                    <legend>Services</legend>
                    <div className="choices">
                      {SERVICES.map((name) => (
                        <label key={name} className="choice">
                          <input type="checkbox" name="services" value={name} />
                          <span>{name}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="field">
                    <span>Budget</span>
                    <select name="budget" defaultValue="">
                      <option value="">Choose…</option>
                      {BUDGETS.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <label className="field">
                <span>Message</span>
                <textarea name="message" rows={6} required minLength={10} maxLength={5000} />
              </label>
              {quote && (
                <div className="field">
                  <span id="files-label">Plans or references (optional)</span>
                  <label className="file-drop">
                    <input
                      type="file"
                      name="files"
                      multiple
                      accept={FILE_EXTENSIONS.map((extension) => `.${extension}`).join(',')}
                      onChange={addFiles}
                      aria-labelledby="files-label"
                      aria-describedby="files-hint"
                    />
                    <span>Choose files</span>
                  </label>
                  <small id="files-hint" className="file-hint">
                    PDF, images, DWG/DXF, Revit, SketchUp, IFC, ZIP or Office · up to {MAX_FILES} files, 10 MB in total
                  </small>
                  {files.length > 0 && (
                    <ul className="file-list">
                      {files.map((file, index) => (
                        <li key={`${file.name}-${file.size}`}>
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">{megabytes(file.size)}</span>
                          <button
                            type="button"
                            onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                            aria-label={`Remove ${file.name}`}
                          >
                            <CloseIcon />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {filesProblem && (
                    <p className="form-error" role="alert">
                      {filesProblem}
                    </p>
                  )}
                </div>
              )}

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
                <button className="button button-primary" type="submit" disabled={state.phase === 'sending' || Boolean(filesProblem)}>
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
