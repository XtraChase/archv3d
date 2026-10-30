import WebSocket from 'ws';
import { ITransport, SignallingProtocol, BaseMessage } from '@epicgames-ps/lib-pixelstreamingcommon-ue5.7';
import { IPlayer, IPlayerInfo } from './PlayerRegistry';
import { IStreamer } from './StreamerRegistry';
import * as LogUtils from './LoggingUtils';
import { SignallingServer } from './SignallingServer';
/**
 * A connection between the signalling server and a player connection.
 * This is where messages expected to be handled by the player come in
 * and where messages are sent to the player.
 *
 * Interesting internals:
 * playerId: The unique id string of this player.
 * transport: The ITransport where transport events can be subscribed to
 * protocol: The SignallingProtocol where signalling messages can be
 * subscribed to.
 */
export declare class PlayerConnection implements IPlayer, LogUtils.IMessageLogger {
    playerId: string;
    transport: ITransport;
    protocol: SignallingProtocol;
    subscribedStreamer: IStreamer | null;
    remoteAddress?: string;
    private server;
    private streamerIdChangeListener;
    private streamerDisconnectedListener;
    /**
     * Initializes a new connection with given and sane values. Adds listeners for the
     * websocket close and error so it can react by unsubscribing and resetting itself.
     * @param server - The signalling server object that spawned this player.
     * @param ws - The websocket coupled to this player connection.
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
     * @returns An IPlayerInfo object containing viewable information about this connection.
     */
    getPlayerInfo(): IPlayerInfo;
    private registerMessageHandlers;
    private sendToStreamer;
    private subscribe;
    private unsubscribe;
    private disconnect;
    private onStreamerDisconnected;
    private onTransportError;
    private onTransportClose;
    private onSubscribeMessage;
    private onUnsubscribeMessage;
    private onListStreamers;
    private onStreamerIdChanged;
    private onPingMessage;
}
