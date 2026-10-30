// Live availability of the streamed experience. While the stream is up it comes from the gateway's waiting-line
// socket (servers/gateway.mjs), which the page only watches (never sends 'join'). When that socket can't connect,
// the on-demand cloud VM may be asleep or booting: the wake service (control/, settings.controlUrl) says which, and
// says 'off' when the desktop Stop shortcut has switched waking off. Retries every few seconds so it follows changes.
import { useEffect, useState } from 'react';
import { cloudStatus, queueUrl } from '../site';

export type AvailabilityStatus = 'checking' | 'available' | 'busy' | 'starting' | 'asleep' | 'unavailable';

export interface Availability {
  status: AvailabilityStatus;
  /** Visitors waiting in line while busy. */
  waiting: number;
}

interface QueueMessage {
  type: 'queue';
  online: boolean;
  busy: boolean;
  waiting: number;
}

const RETRY_MS = 5000;
// A tunnel that's down usually fails at once; this covers connections that hang instead.
const OPEN_TIMEOUT_MS = 8000;

export function useAvailability(): Availability {
  const [availability, setAvailability] = useState<Availability>({ status: 'checking', waiting: 0 });

  useEffect(() => {
    let socket: WebSocket | null = null;
    let openTimer = 0;
    let retryTimer = 0;
    let disposed = false;

    const retry = async () => {
      if (disposed) return;
      // The stream isn't reachable: ask the wake service whether the cloud VM is asleep or on its way up.
      const cloud = await cloudStatus();
      if (disposed) return;
      setAvailability({
        status: cloud === 'asleep' ? 'asleep' : cloud === 'starting' || cloud === 'running' ? 'starting' : 'unavailable',
        waiting: 0
      });
      retryTimer = window.setTimeout(connect, RETRY_MS);
    };

    function connect() {
      try {
        socket = new WebSocket(queueUrl);
      } catch {
        // E.g. a ws:// URL from an https page.
        void retry();
        return;
      }
      openTimer = window.setTimeout(() => socket?.close(), OPEN_TIMEOUT_MS);
      socket.onopen = () => window.clearTimeout(openTimer);
      socket.onmessage = (event) => {
        let message: QueueMessage;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type !== 'queue') return;
        // Gateway up but the game not streaming yet: it's starting (or restarting after a crash).
        if (!message.online) setAvailability({ status: 'starting', waiting: 0 });
        else if (message.busy) setAvailability({ status: 'busy', waiting: message.waiting });
        else setAvailability({ status: 'available', waiting: 0 });
      };
      socket.onclose = () => {
        window.clearTimeout(openTimer);
        void retry();
      };
    }

    connect();
    return () => {
      disposed = true;
      window.clearTimeout(openTimer);
      window.clearTimeout(retryTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, []);

  return availability;
}

export function availabilityLabel({ status, waiting }: Availability) {
  switch (status) {
    case 'available':
      return 'Available Now';
    case 'busy':
      return waiting ? `In Use · ${waiting} waiting` : 'In Use';
    case 'starting':
      return 'Starting up…';
    case 'asleep':
      return 'Asleep · wakes on request';
    case 'unavailable':
      return 'Unavailable';
    default:
      return 'Checking…';
  }
}
