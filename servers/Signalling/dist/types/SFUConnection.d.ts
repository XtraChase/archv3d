import WebSocket from 'ws';
import { ITransport, SignallingProtocol, BaseMessage, EventEmitter } from '@epicgames-ps/lib-pixelstreamingcommon-ue5.7';
import { IPlayer, IPlayerInfo } from './PlayerRegistry';
import { IStreamer, IStreamerInfo } from './StreamerRegistry';
import * as LogUtils from './LoggingUtils';
import { SignallingServer } from './SignallingServer';
/**
 * A SFU connection to the signalling server.
 * An SFU can act as both a streamer and a player. It can subscribe to
 * streamers like a player, and other players can subscribe to the sfu.
 * Therefore the SFU will have a streamer id and a player id and be
 * registered in both streamer registries and player registries.
 *
 * Interesting internals:
 * playerId: The player id of this connectiom.
 * streamerId: The streamer id of this connection.
 * transport: The ITransport where transport events can be subscribed to
 * protocol: The SignallingProtocol where signalling messages can be
 * subscribed to.
 * streaming: True when the streamer is ready to accept subscriptions.
 */
export declare class SFUConnection extends EventEmitter implements IPlayer, IStreamer, LogUtils.IMessageLogger {
    playerId: string;
    streamerId: string;
    transport: ITransport;
    protocol: SignallingProtocol;
    streaming: boolean;
    subscribedStreamer: IStreamer | null;
    remoteAddress?: string;
    maxSubscribers: number;
    subscribers: Set<string>;
    private server;
    private layerPreferenceListener;
    private streamerIdChangeListener;
    private streamerDisconnectedListener;
    /**
     * Construct a new SFU connection.
     * @param server - The signalling server object that spawned this sfu.
     * @param ws - The websocket coupled to this sfu connection.
     * @param remoteAddress - The remote address of this connection. Only used as display.
     */
    constructor(server: SignallingServer, ws: WebSocket, remoteAddress?: string);
    /**
     * Returns an identifier that is displayed in logs.
     * @returns A string describing this connection.
     */
    getReadableIdentifier(): string;
    /**
     * Sends a signalling message to the SFU.
     * @param message - The message to send.
     */
    sendMessage(message: BaseMessage): void;
    /**
     * Returns a descriptive object for the REST API inspection operations.
     * @returns An IStreamerInfo object containing viewable information about this connection.
     */
    getStreamerInfo(): IStreamerInfo;
    /**
     * Returns a descriptive object for the REST API inspection operations.
     * @returns An IPlayerInfo object containing viewable information about this connection.
     */
    getPlayerInfo(): IPlayerInfo;
    private registerMessageHandlers;
    private subscribe;
    private unsubscribe;
    private sendToStreamer;
    private sendToPlayer;
    private disconnect;
    private onLayerPreference;
    private onStreamerIdChanged;
    private onStreamerDisconnected;
    private onTransportError;
    private onTransportClose;
    private onSubscribeMessage;
    private onUnsubscribeMessage;
    private onListStreamers;
    private onStreamerDataChannels;
    private onEndpointId;
    private onStartStreaming;
    private onStopStreaming;
    private onPingMessage;
}
