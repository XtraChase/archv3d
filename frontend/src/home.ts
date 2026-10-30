// Landing page: pick a level, with live availability from the gateway's waiting line (watched, never joined).
import { levels, levelUrl, queueUrl, settings } from './site';
import './styles.css';
import './home.css';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector(selector) as T;

if (settings.title) {
  $('#home-title').textContent = settings.title;
  document.title = `${settings.title} · Interactive architecture`;
}
if (settings.subtitle) $('#home-subtitle').textContent = settings.subtitle;

$('#level-grid').replaceChildren(
  ...levels.map((level) => {
    const card = document.createElement('a');
    card.className = 'level-card';
    card.href = levelUrl(level.id);

    const media = document.createElement('div');
    media.className = 'level-media';
    if (level.image) {
      const image = document.createElement('img');
      image.src = level.image;
      image.alt = '';
      image.loading = 'lazy';
      // No picture yet: keep the plain gradient.
      image.addEventListener('error', () => image.remove());
      media.append(image);
    }

    const body = document.createElement('div');
    body.className = 'level-body';
    const title = document.createElement('h2');
    title.textContent = level.title;
    body.append(title);
    if (level.subtitle) {
      const subtitle = document.createElement('p');
      subtitle.className = 'level-subtitle';
      subtitle.textContent = level.subtitle;
      body.append(subtitle);
    }
    if (level.description) {
      const description = document.createElement('p');
      description.className = 'level-description muted';
      description.textContent = level.description;
      body.append(description);
    }
    const action = document.createElement('span');
    action.className = 'primary level-action';
    action.textContent = 'Explore';
    body.append(action);

    card.append(media, body);
    return card;
  })
);

// ---- Availability -------------------------------------------------------------------------
// Same socket the experience uses for its line; without a 'join' it only receives the queue status.

interface QueueMessage {
  type: 'queue';
  online: boolean;
  busy: boolean;
  waiting: number;
}

function showAvailability(state: 'free' | 'busy' | 'restarting' | 'offline' | 'checking', text: string) {
  $('#availability').dataset.state = state;
  $('#availability-text').textContent = text;
}

function watchQueue() {
  const socket = new WebSocket(queueUrl);
  const openTimer = window.setTimeout(() => socket.close(), 8000);
  socket.onopen = () => window.clearTimeout(openTimer);
  socket.onmessage = (event) => {
    let message: QueueMessage;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.type !== 'queue') return;
    if (!message.online) showAvailability('restarting', 'Restarting, back in a minute');
    else if (message.busy) {
      showAvailability('busy', message.waiting ? `In use · ${message.waiting} waiting` : 'In use · you can join the line');
    } else showAvailability('free', 'Available now');
  };
  socket.onclose = () => {
    window.clearTimeout(openTimer);
    showAvailability('offline', 'Offline right now');
    window.setTimeout(watchQueue, 5000);
  };
}

showAvailability('checking', 'Checking availability…');
watchQueue();
