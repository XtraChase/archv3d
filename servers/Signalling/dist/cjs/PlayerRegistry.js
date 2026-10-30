"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerRegistry = void 0;
// Copyright Epic Games, Inc. All Rights Reserved.
const lib_pixelstreamingcommon_ue5_7_1 = require("@epicgames-ps/lib-pixelstreamingcommon-ue5.7");
const Logger_1 = require("./Logger");
/**
 * Handles all the player connections of a signalling server and
 * can be used to lookup connections by id etc.
 * Fires events when players are added or removed.
 * Events:
 *   'added': (playerId: string) Player was added.
 *   'removed': (playerId: string) Player was removed.
 */
class PlayerRegistry extends lib_pixelstreamingcommon_ue5_7_1.EventEmitter {
    constructor() {
        super();
        this.players = new Map();
        this.players = new Map();
        this.playerCount = 0;
        this.nextPlayerId = 0;
    }
    /**
     * Assigns a unique id to the player and adds it to the registry
     */
    add(player) {
        player.playerId = this.getUniquePlayerId();
        this.players.set(player.playerId, player);
        this.playerCount++;
        this.emit('added', player.playerId);
        Logger_1.Logger.info(`Registered new player: ${player.playerId}`);
    }
    /**
     * Removes a player from the registry. Does nothing if the id
     * does not exist.
     */
    remove(player) {
        if (!this.players.has(player.playerId)) {
            return;
        }
        this.emit('removed', player.playerId);
        this.players.delete(player.playerId);
        this.playerCount--;
        Logger_1.Logger.info(`Unregistered player: ${player.playerId}`);
    }
    /**
     * Tests if a player id exists in the registry.
     */
    has(playerId) {
        return this.players.has(playerId);
    }
    /**
     * Gets a player from the registry using the player id.
     * Returns undefined if the player doesn't exist.
     */
    get(playerId) {
        return this.players.get(playerId);
    }
    listPlayers() {
        return Array.from(this.players.values());
    }
    /**
     * Returns true when the registry is empty.
     */
    empty() {
        return this.players.size == 0;
    }
    /**
     * Gets the total number of connected players.
     */
    count() {
        return this.players.size;
    }
    getUniquePlayerId() {
        const newPlayerId = `Player${this.nextPlayerId}`;
        this.nextPlayerId++;
        return newPlayerId;
    }
}
exports.PlayerRegistry = PlayerRegistry;
//# sourceMappingURL=PlayerRegistry.js.map