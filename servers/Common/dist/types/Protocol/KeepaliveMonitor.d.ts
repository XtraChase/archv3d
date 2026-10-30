import { SignallingProtocol } from './SignallingProtocol';
/**
 * Used to regularly ping a protocol connection to make sure the connection is still good and open.
 * When the pong doesn't come in response to a ping in time a callback is fired that can be handed
 * by the owner.
 */
export declare class KeepaliveMonitor {
    private protocol;
    private timeout;
    private keepalive?;
    private alive;
    private rtt;
    private onResponse;
    /**
     * Called when a pong does not come back from a ping.
     */
    onTimeout?: () => void;
    /**
     * Gets the Round Trip Time of the current connection in milliseconds.
     */
    get RTT(): number;
    /**
     * Creates a new monitor and starts the ping timer. If a pong does not come back by the time we want
     * to send a second ping then the connection is considered dead and the onTimeout callback is fired.
     * @param protocol - The connection that we want to monitor.
     * @param timeout - The time in milliseconds between ping messages.
     */
    constructor(protocol: SignallingProtocol, timeout: number);
    private start;
    private stop;
    private sendHeartbeat;
    private onHeartbeatResponse;
}
