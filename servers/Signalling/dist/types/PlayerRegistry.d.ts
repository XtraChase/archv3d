import { SignallingProtocol, BaseMessage, EventEmitter } from '@epicgames-ps/lib-pixelstreamingcommon-ue5.7';
import { IMessageLogger } from './LoggingUtils';
import { IStreamer } from './StreamerRegistry';
/**
 * An interface that describes a player that can be added to the
 * player registry.
 */
export interface IPlayer extends IMessageLogger {
    playerId: string;
    protocol: SignallingProtocol;
    subscribedStreamer: IStreamer | null;
    sendMessage(message: BaseMessage): void;
    getPlayerInfo(): IPlayerInfo;
}
/**
 * Used by the API to describe the current state of the player.
 */
export interface IPlayerInfo {
    playerId: string;
    type: string;
    subscribedTo: string | undefined;
    remoteAddress: string | undefined;
}
/**
 * Handles all the player connections of a signalling server and
 * can be used to lookup connections by id etc.
 * Fires events when players are added or removed.
 * Events:
 *   'added': (playerId: string) Player was added.
 *   'removed': (playerId: string) Player was removed.
 */
export declare class PlayerRegistry extends EventEmitter {
    private players;
    private playerCount;
    private nextPlayerId;
    constructor();
    /**
     * Assigns a unique id to the player and adds it to the registry
     */
    add(player: IPlayer): void;
    /**
     * Removes a player from the registry. Does nothing if the id
     * does not exist.
     */
    remove(player: IPlayer): void;
    /**
     * Tests if a player id exists in the registry.
     */
    has(playerId: string): boolean;
    /**
     * Gets a player from the registry using the player id.
     * Returns undefined if the player doesn't exist.
     */
    get(playerId: string): IPlayer | undefined;
    listPlayers(): IPlayer[];
    /**
     * Returns true when the registry is empty.
     */
    empty(): boolean;
    /**
     * Gets the total number of connected players.
     */
    count(): number;
    private getUniquePlayerId;
}
