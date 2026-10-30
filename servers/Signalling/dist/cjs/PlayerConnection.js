"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerConnection = void 0;
const lib_pixelstreamingcommon_ue5_7_1 = require("@epicgames-ps/lib-pixelstreamingcommon-ue5.7");
const Logger_1 = require("./Logger");
const LogUtils = __importStar(require("./LoggingUtils"));
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
class PlayerConnection {
    /**
     * Initializes a new connection with given and sane values. Adds listeners for the
     * websocket close and error so it can react by unsubscribing and resetting itself.
     * @param server - The signalling server object that spawned this player.
     * @param ws - The websocket coupled to this player connection.
     * @param remoteAddress - The remote address of this connection. Only used as display.
     */
    constructor(server, ws, remoteAddress) {
        this.server = server;
        this.playerId = '';
        this.subscribedStreamer = null;
        this.transport = new lib_pixelstreamingcommon_ue5_7_1.WebSocketTransportNJS(ws);
        this.protocol = new lib_pixelstreamingcommon_ue5_7_1.SignallingProtocol(this.transport);
        this.remoteAddress = remoteAddress;
        this.transport.on('error', this.onTransportError.bind(this));
        this.transport.on('close', this.onTransportClose.bind(this));
        this.streamerIdChangeListener = this.onStreamerIdChanged.bind(this);
        this.streamerDisconnectedListener = this.onStreamerDisconnected.bind(this);
        this.registerMessageHandlers();
    }
    /**
     * Returns an identifier that is displayed in logs.
     * @returns A string describing this connection.
     */
    getReadableIdentifier() {
        return this.playerId;
    }
    /**
     * Sends a signalling message to the player.
     * @param message - The message to send.
     */
    sendMessage(message) {
        LogUtils.logOutgoing(this, message);
        this.protocol.sendMessage(message);
    }
    /**
     * Returns a descriptive object for the REST API inspection operations.
     * @returns An IPlayerInfo object containing viewable information about this connection.
     */
    getPlayerInfo() {
        var _a;
        return {
            playerId: this.playerId,
            type: 'Player',
            subscribedTo: (_a = this.subscribedStreamer) === null || _a === void 0 ? void 0 : _a.streamerId,
            remoteAddress: this.remoteAddress
        };
    }
    registerMessageHandlers() {
        /* eslint-disable @typescript-eslint/unbound-method */
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.subscribe.typeName, LogUtils.createHandlerListener(this, this.onSubscribeMessage));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.unsubscribe.typeName, LogUtils.createHandlerListener(this, this.onUnsubscribeMessage));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.listStreamers.typeName, LogUtils.createHandlerListener(this, this.onListStreamers));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.ping.typeName, LogUtils.createHandlerListener(this, this.onPingMessage));
        /* eslint-enable @typescript-eslint/unbound-method */
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.offer.typeName, this.sendToStreamer.bind(this));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.answer.typeName, this.sendToStreamer.bind(this));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.iceCandidate.typeName, this.sendToStreamer.bind(this));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.dataChannelRequest.typeName, this.sendToStreamer.bind(this));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.peerDataChannelsReady.typeName, this.sendToStreamer.bind(this));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.layerPreference.typeName, this.sendToStreamer.bind(this));
        this.protocol.on('unhandled', (message) => {
            Logger_1.Logger.warn(`Unhandled player protocol message: ${JSON.stringify(message)}`);
        });
    }
    sendToStreamer(message) {
        if (!this.subscribedStreamer) {
            Logger_1.Logger.warn(`Player ${this.playerId} tried to send to a streamer but they're not subscribed to any.`);
            const streamerId = this.server.streamerRegistry.getFirstStreamerId();
            if (!streamerId) {
                Logger_1.Logger.error('There are no streamers to force a subscription. Disconnecting.');
                this.disconnect();
                return;
            }
            else {
                Logger_1.Logger.warn(`Subscribing to ${streamerId}`);
                this.subscribe(streamerId);
            }
        }
        message.playerId = this.playerId;
        LogUtils.logForward(this, this.subscribedStreamer, message);
        this.subscribedStreamer.protocol.sendMessage(message);
    }
    subscribe(streamerId) {
        const streamer = this.server.streamerRegistry.find(streamerId);
        if (!streamer) {
            Logger_1.Logger.error(`subscribe: Player ${this.playerId} tried to subscribe to a non-existent streamer ${streamerId}`);
            const failureMessage = lib_pixelstreamingcommon_ue5_7_1.MessageHelpers.createMessage(lib_pixelstreamingcommon_ue5_7_1.Messages.subscribeFailed, {
                message: `Streamer ${streamerId} does not exist.`
            });
            this.protocol.sendMessage(failureMessage);
            return;
        }
        if (this.subscribedStreamer) {
            Logger_1.Logger.warn(`subscribe: Player ${this.playerId} is resubscribing to a streamer but is already subscribed to ${this.subscribedStreamer.streamerId}`);
            this.unsubscribe();
        }
        if (streamer.maxSubscribers > 0 && streamer.subscribers.size >= streamer.maxSubscribers) {
            Logger_1.Logger.error(`subscribe: Player ${this.playerId} could not subscribe to ${streamerId}. Max players (${streamer.maxSubscribers}) reached.`);
            const failureMessage = lib_pixelstreamingcommon_ue5_7_1.MessageHelpers.createMessage(lib_pixelstreamingcommon_ue5_7_1.Messages.subscribeFailed, {
                message: `Streamer ${streamerId} is full. Max players = ${streamer.maxSubscribers}.`
            });
            this.protocol.sendMessage(failureMessage);
            return;
        }
        this.subscribedStreamer = streamer;
        this.subscribedStreamer.subscribers.add(this.playerId);
        this.subscribedStreamer.on('id_changed', this.streamerIdChangeListener);
        this.subscribedStreamer.on('disconnect', this.streamerDisconnectedListener);
        const connectedMessage = lib_pixelstreamingcommon_ue5_7_1.MessageHelpers.createMessage(lib_pixelstreamingcommon_ue5_7_1.Messages.playerConnected, {
            playerId: this.playerId,
            dataChannel: true,
            sfu: false
        });
        this.sendToStreamer(connectedMessage);
    }
    unsubscribe() {
        if (!this.subscribedStreamer) {
            return;
        }
        this.subscribedStreamer.subscribers.delete(this.playerId);
        const disconnectedMessage = lib_pixelstreamingcommon_ue5_7_1.MessageHelpers.createMessage(lib_pixelstreamingcommon_ue5_7_1.Messages.playerDisconnected, {
            playerId: this.playerId
        });
        this.sendToStreamer(disconnectedMessage);
        this.subscribedStreamer.off('id_changed', this.streamerIdChangeListener);
        this.subscribedStreamer.off('disconnect', this.streamerDisconnectedListener);
        this.subscribedStreamer = null;
    }
    disconnect() {
        this.unsubscribe();
        this.protocol.disconnect();
    }
    onStreamerDisconnected() {
        this.disconnect();
    }
    onTransportError(error) {
        Logger_1.Logger.error(`Player (${this.playerId}) transport error ${error.message}`);
    }
    onTransportClose(_event) {
        Logger_1.Logger.debug('PlayerConnection transport close.');
        this.disconnect();
    }
    onSubscribeMessage(message) {
        this.subscribe(message.streamerId);
    }
    onUnsubscribeMessage(_message) {
        this.unsubscribe();
    }
    onListStreamers(_message) {
        const listMessage = lib_pixelstreamingcommon_ue5_7_1.MessageHelpers.createMessage(lib_pixelstreamingcommon_ue5_7_1.Messages.streamerList, {
            ids: this.server.streamerRegistry.streamers
                .filter((streamer) => streamer.streaming)
                .map((streamer) => streamer.streamerId)
        });
        this.sendMessage(listMessage);
    }
    onStreamerIdChanged(newId) {
        const renameMessage = lib_pixelstreamingcommon_ue5_7_1.MessageHelpers.createMessage(lib_pixelstreamingcommon_ue5_7_1.Messages.streamerIdChanged, { newID: newId });
        this.sendMessage(renameMessage);
    }
    onPingMessage(message) {
        this.sendMessage(lib_pixelstreamingcommon_ue5_7_1.MessageHelpers.createMessage(lib_pixelstreamingcommon_ue5_7_1.Messages.pong, { time: message.time }));
    }
}
exports.PlayerConnection = PlayerConnection;
//# sourceMappingURL=PlayerConnection.js.map