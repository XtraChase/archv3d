import { ITransport, SignallingProtocol, BaseMessage, EventEmitter } from '@epicgames-ps/lib-pixelstreamingcommon-ue5.7';
import { IMessageLogger } from './LoggingUtils';
import { IPlayerInfo } from './PlayerRegistry';
/**
 * An interface that describes a streamer that can be added to the
 * streamer registry.
 */
export interface IStreamer extends EventEmitter, IMessageLogger {
    streamerId: string;
    transport: ITransport;
    protocol: SignallingProtocol;
    streaming: boolean;
    maxSubscribers: number;
    subscribers: Set<string>;
    sendMessage(message: BaseMessage): void;
    getStreamerInfo(): IStreamerInfo;
}
/**
 * Used by the API to describe a streamer.
 */
export interface IStreamerInfo {
    streamerId: string;
    type: string;
    streaming: boolean;
    remoteAddress: string | undefined;
    subscribers: IPlayerInfo[];
}
/**
 * Handles all the streamer connections of a signalling server and
 * can be used to lookup connections by id etc.
 * Fires events when streamers are added or removed.
 * Events:
 *   'added': (playerId: string) Player was added.
 *   'removed': (playerId: string) Player was removed.
 */
export declare class StreamerRegistry extends EventEmitter {
    streamers: IStreamer[];
    defaultStreamerIdPrefix: string;
    constructor();
    /**
     * Adds a streamer to the registry. If the streamer already has an id
     * it will be sanitized (checked against existing ids and altered if
     * there are collisions), or if it has no id it will be assigned a
     * default unique id.
     * @returns True if the add was successful.
     */
    add(streamer: IStreamer): boolean;
    /**
     * Removes a streamer from the registry. If the streamer isn't found
     * it does nothing.
     * @returns True if the streamer was removed.
     */
    remove(streamer: IStreamer): boolean;
    /**
     * Attempts to find the given streamer id in the registry.
     */
    find(streamerId: string): IStreamer | undefined;
    /**
     * Used by players who haven't subscribed but try to send a message.
     * This is to cover legacy connections that do not know how to subscribe.
     * The player will be assigned the first streamer in the list.
     * @returns The first streamerId in the registry or null if there are none.
     */
    getFirstStreamerId(): string | null;
    /**
     * Returns true when the registry is empty.
     */
    empty(): boolean;
    /**
     * Returns the total number of connected streamers.
     */
    count(): number;
    private onEndpointId;
    private sanitizeStreamerId;
}
