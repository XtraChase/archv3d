import WebSocket from 'ws';
import { ITransport, SignallingProtocol, BaseMessage, EventEmitter } from '@epicgames-ps/lib-pixelstreamingcommon-ue5.7';
import { IStreamer, IStreamerInfo } from './StreamerRegistry';
import * as LogUtils from './LoggingUtils';
import { SignallingServer } from './SignallingServer';
/**
 * A connection between the signalling server and a streamer connection.
 * This is where messages expected to be handled by the streamer come in
 * and where messages are sent to the streamer.
 *
 * Interesting internals:
 * streamerId: The unique id string of this streamer.
 * transport: The ITransport where transport events can be subscribed to
 * protocol: The SignallingProtocol where signalling messages can be
 * subscribed to.
 * streaming: True when the streamer is ready to accept subscriptions.
 */
export declare class StreamerConnection extends EventEmitter implements IStreamer, LogUtils.IMessageLogger {
    streamerId: string;
    transport: ITransport;
    protocol: SignallingProtocol;
    streaming: boolean;
    remoteAddress?: string;
    maxSubscribers: number;
    subscribers: Set<string>;
    private server;
    /**
     * Initializes a new connection with given and sane values. Adds listeners for the
     * websocket close and error and will emit a disconnected event when disconneted.
     * @param server - The signalling server object that spawned this streamer.
     * @param ws - The websocket coupled to this streamer connection.
     * @param remoteAddress - The remote address of this connection. Only used as display.
     */
    constructor(server: SignallingServer, ws: WebSocket, remoteAddress?: string);
    /**
     * Returns an identifier that is displayed in logs.
     * @returns A string describing this connection.
     */
    getReadableIdentifier(): string;
    /**
     * Sends a signalling message to the player.
     * @param message - The message to send.
     */
    sendMessage(message: BaseMessage): void;
    /**
     * Returns a descriptive object for the REST API inspection operations.
     * @returns An IStreamerInfo object containing viewable information about this connection.
     */
    getStreamerInfo(): IStreamerInfo;
    private registerMessageHandlers;
    private forwardMessage;
    private onTransportError;
    private onTransportClose;
    private onEndpointId;
    private onDisconnectPlayerRequest;
    private onLayerPreference;
    private onPingMessage;
}
