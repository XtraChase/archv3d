// Live availability of the streamed experience, from the gateway's waiting-line socket (servers/gateway.mjs).
// The page only watches the line (never sends 'join'). When the streaming PC is stopped the tunnel is down, the socket
// can't connect and the experience shows as unavailable; it keeps retrying so it turns green again once started.
import { useEffect, useState } from 'react';
import { queueUrl } from '../site';

export type AvailabilityStatus = 'checking' | 'available' | 'busy' | 'unavailable';

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

    const retry = () => {
      if (disposed) return;
      setAvailability({ status: 'unavailable', waiting: 0 });
      retryTimer = window.setTimeout(connect, RETRY_MS);
    };

    function connect() {
      try {
        socket = new WebSocket(queueUrl);
      } catch {
        // E.g. a ws:// URL from an https page.
        retry();
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
        if (!message.online) setAvailability({ status: 'unavailable', waiting: 0 });
        else if (message.busy) setAvailability({ status: 'busy', waiting: message.waiting });
        else setAvailability({ status: 'available', waiting: 0 });
      };
      socket.onclose = () => {
        window.clearTimeout(openTimer);
        retry();
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
    case 'unavailable':
      return 'Unavailable';
    default:
      return 'Checking…';
  }
}
