// #/privacy: what the site records about visits (control/src/insights.ts) and the contact form, in plain language,
// with a per-device opt-out. Keep it in step with the Worker if what's recorded changes.
import { useState } from 'react';
import { OPT_OUT_KEY, trackingAllowed } from '../site';
import { href } from './routing';
import { profile } from './profile';
import { BackIcon } from './icons';

function readOptOut() {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

export function PrivacyPage() {
  const [optedOut, setOptedOut] = useState(readOptOut);
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  const browserSignal = Boolean(nav.globalPrivacyControl || nav.doNotTrack === '1');

  const toggle = () => {
    try {
      if (optedOut) localStorage.removeItem(OPT_OUT_KEY);
      else localStorage.setItem(OPT_OUT_KEY, '1');
    } catch {
      // Storage blocked; nothing to change.
    }
    setOptedOut(readOptOut());
  };

  return (
    <article className="section privacy">
      <a className="back-link" href={href.home}>
        <BackIcon /> Home
      </a>
      <p className="kicker">Privacy</p>
      <h1 className="section-title">How this site treats your visit</h1>
      <p className="section-lede muted">Updated November 2026. Short version: no cookies, no tracking across sites, no selling.</p>

      <h2>What is recorded</h2>
      <p>
        To understand which work interests people, the site notes each page you open, the projects and live experiences
        you view, and whether you used the contact form. With each of those it keeps:
      </p>
      <ul>
        <li>the country, region and city your connection comes from, and the name of the network operator (your company, school or internet provider), as reported by Cloudflare, which hosts the site;</li>
        <li>the website that linked you here (its name only, never the full address);</li>
        <li>your device type, browser and operating system family;</li>
        <li>a visitor code that changes every day. It is made from a random value that is deleted the next day, so visits can be counted per day but not linked across days or back to you.</li>
      </ul>

      <h2>What is not</h2>
      <ul>
        <li>No cookies, and nothing is stored in your browser.</li>
        <li>Your IP address is not stored. It is used only for a moment to make the daily visitor code.</li>
        <li>No advertising or third-party trackers, and nothing is sold or shared.</li>
      </ul>

      <h2>Contact form</h2>
      <p>
        When you send a message, your name, email, topic and message are emailed to {profile.name} and kept with the
        same location and network details, so your request can be answered and followed up. Ask and it is deleted.
      </p>

      <h2>How long, and who sees it</h2>
      <p>
        Visit records are deleted after 13 months. Messages are kept until you ask for them to be deleted or they are
        no longer needed. Only {profile.name} sees them, through Cloudflare (which hosts the site and stores the records)
        and email.
      </p>

      <h2>Your choices</h2>
      <p>
        Nothing is recorded when your browser sends Global Privacy Control or Do Not Track.
        {browserSignal ? ' Your browser sends one of these signals, so this visit is not recorded.' : ''} You can also
        stop this device from being counted:
      </p>
      <p>
        <button className="button button-ghost" onClick={toggle}>
          {optedOut ? 'Count my visits again on this device' : 'Don’t count my visits on this device'}
        </button>
      </p>
      <p className="muted">
        {trackingAllowed()
          ? 'Visits from this device are currently counted.'
          : 'Visits from this device are currently not counted.'}{' '}
        This choice is saved in your browser only, to remember it.
      </p>
      <p>
        Questions, or a copy or deletion of anything about you: <a href={`mailto:${profile.email}`}>{profile.email}</a>.
      </p>
    </article>
  );
}
