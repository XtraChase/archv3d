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
exports.SFUConnection = void 0;
const lib_pixelstreamingcommon_ue5_7_1 = require("@epicgames-ps/lib-pixelstreamingcommon-ue5.7");
const Logger_1 = require("./Logger");
const LogUtils = __importStar(require("./LoggingUtils"));
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
class SFUConnection extends lib_pixelstreamingcommon_ue5_7_1.EventEmitter {
    /**
     * Construct a new SFU connection.
     * @param server - The signalling server object that spawned this sfu.
     * @param ws - The websocket coupled to this sfu connection.
     * @param remoteAddress - The remote address of this connection. Only used as display.
     */
    constructor(server, ws, remoteAddress) {
        super();
        this.server = server;
        this.transport = new lib_pixelstreamingcommon_ue5_7_1.WebSocketTransportNJS(ws);
        this.protocol = new lib_pixelstreamingcommon_ue5_7_1.SignallingProtocol(this.transport);
        this.playerId = '';
        this.streamerId = '';
        this.streaming = false;
        this.remoteAddress = remoteAddress;
        this.subscribedStreamer = null;
        this.maxSubscribers = 0;
        this.subscribers = new Set();
        this.transport.on('error', this.onTransportError.bind(this));
        this.transport.on('close', this.onTransportClose.bind(this));
        this.layerPreferenceListener = this.onLayerPreference.bind(this);
        this.streamerIdChangeListener = this.onStreamerIdChanged.bind(this);
        this.streamerDisconnectedListener = this.onStreamerDisconnected.bind(this);
        this.registerMessageHandlers();
    }
    /**
     * Returns an identifier that is displayed in logs.
     * @returns A string describing this connection.
     */
    getReadableIdentifier() {
        return `(${this.streamerId}:${this.playerId})`;
    }
    /**
     * Sends a signalling message to the SFU.
     * @param message - The message to send.
     */
    sendMessage(message) {
        LogUtils.logOutgoing(this, message);
        this.protocol.sendMessage(message);
    }
    /**
     * Returns a descriptive object for the REST API inspection operations.
     * @returns An IStreamerInfo object containing viewable information about this connection.
     */
    getStreamerInfo() {
        return {
            streamerId: this.streamerId,
            type: 'SFU',
            streaming: this.streaming,
            remoteAddress: this.remoteAddress,
            subscribers: this.server.playerRegistry
                .listPlayers()
                .filter((player) => player.subscribedStreamer == this)
                .map((player) => player.getPlayerInfo())
        };
    }
    /**
     * Returns a descriptive object for the REST API inspection operations.
     * @returns An IPlayerInfo object containing viewable information about this connection.
     */
    getPlayerInfo() {
        var _a;
        return {
            playerId: this.playerId,
            type: 'SFU',
            remoteAddress: this.remoteAddress,
            subscribedTo: (_a = this.subscribedStreamer) === null || _a === void 0 ? void 0 : _a.streamerId
        };
    }
    registerMessageHandlers() {
        /* eslint-disable @typescript-eslint/unbound-method */
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.subscribe.typeName, LogUtils.createHandlerListener(this, this.onSubscribeMessage));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.unsubscribe.typeName, LogUtils.createHandlerListener(this, this.onUnsubscribeMessage));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.listStreamers.typeName, LogUtils.createHandlerListener(this, this.onListStreamers));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.endpointId.typeName, LogUtils.createHandlerListener(this, this.onEndpointId));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.streamerDataChannels.typeName, LogUtils.createHandlerListener(this, this.onStreamerDataChannels));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.startStreaming.typeName, LogUtils.createHandlerListener(this, this.onStartStreaming));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.stopStreaming.typeName, LogUtils.createHandlerListener(this, this.onStopStreaming));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.ping.typeName, LogUtils.createHandlerListener(this, this.onPingMessage));
        /* eslint-enable @typescript-eslint/unbound-method */
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.offer.typeName, this.sendToPlayer.bind(this));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.answer.typeName, this.sendToStreamer.bind(this));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.peerDataChannels.typeName, this.sendToPlayer.bind(this));
    }
    subscribe(streamerId) {
        const streamer = this.server.streamerRegistry.find(streamerId);
        if (!streamer) {
            Logger_1.Logger.error(`subscribe: SFU ${this.playerId} tried to subscribe to a non-existent streamer ${streamerId}`);
            return;
        }
        this.subscribedStreamer = streamer;
        this.subscribedStreamer.on('layer_preference', this.layerPreferenceListener);
        this.subscribedStreamer.on('id_changed', this.streamerIdChangeListener);
        this.subscribedStreamer.on('disconnect', this.streamerDisconnectedListener);
        const connectedMessage = lib_pixelstreamingcommon_ue5_7_1.MessageHelpers.createMessage(lib_pixelstreamingcommon_ue5_7_1.Messages.playerConnected, {
            playerId: this.playerId,
            dataChannel: true,
            sfu: true
        });
        this.sendToStreamer(connectedMessage);
    }
    unsubscribe() {
        if (!this.subscribedStreamer) {
            return;
        }
        const disconnectedMessage = lib_pixelstreamingcommon_ue5_7_1.MessageHelpers.createMessage(lib_pixelstreamingcommon_ue5_7_1.Messages.playerDisconnected, {
            playerId: this.playerId
        });
        this.sendToStreamer(disconnectedMessage);
        this.subscribedStreamer.off('layer_preference', this.layerPreferenceListener);
        this.subscribedStreamer.off('id_changed', this.streamerIdChangeListener);
        this.subscribedStreamer.off('disconnect', this.streamerDisconnectedListener);
        this.subscribedStreamer = null;
    }
    sendToStreamer(message) {
        if (!this.subscribedStreamer) {
            Logger_1.Logger.error(`SFU ${this.playerId} tried to send to a streamer but they're not subscribed to any.`);
            return;
        }
        LogUtils.logForward(this, this.subscribedStreamer, message);
        // normally we want to indicate what player this message came from
        // but in some instances we might already have set this (streamerDataChannels) due to poor choices
        message.playerId = message.playerId || this.playerId;
        this.subscribedStreamer.protocol.sendMessage(message);
    }
    sendToPlayer(message) {
        if (!message.playerId) {
            Logger_1.Logger.error(`SFU ${this.streamerId} trying to send a message to a player with no playerId. Ignored.`);
            return;
        }
        const player = this.server.playerRegistry.get(message.playerId);
        if (player) {
            delete message.playerId;
            LogUtils.logForward(this, player, message);
            player.protocol.sendMessage(message);
        }
        else {
            Logger_1.Logger.error(`SFU attempted to forward to player ${message.playerId} which does not exist.`);
        }
    }
    disconnect() {
        this.unsubscribe();
        this.protocol.disconnect();
        this.emit('disconnect');
    }
    onLayerPreference(message) {
        this.sendMessage(message);
    }
    onStreamerIdChanged(newId) {
        const renameMessage = lib_pixelstreamingcommon_ue5_7_1.MessageHelpers.createMessage(lib_pixelstreamingcommon_ue5_7_1.Messages.streamerIdChanged, { newID: newId });
        this.sendMessage(renameMessage);
    }
    onStreamerDisconnected() {
        this.unsubscribe();
        this.sendMessage(lib_pixelstreamingcommon_ue5_7_1.MessageHelpers.createMessage(lib_pixelstreamingcommon_ue5_7_1.Messages.streamerDisconnected));
        this.streaming = false;
        this.emit('disconnect');
    }
    onTransportError(error) {
        Logger_1.Logger.error(`SFU (${this.playerId}) transport error ${error.message}`);
    }
    onTransportClose(_event) {
        Logger_1.Logger.debug('SFUConnection transport close.');
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
            ids: this.server.streamerRegistry.streamers.map((streamer) => streamer.streamerId)
        });
        this.sendMessage(listMessage);
    }
    onStreamerDataChannels(message) {
        message.sfuId = this.playerId;
        this.sendToStreamer(message);
    }
    onEndpointId(_message) {
        this.streaming = true;
    }
    onStartStreaming(_message) {
        this.streaming = true;
    }
    onStopStreaming(_message) {
        this.streaming = false;
        this.emit('disconnect');
    }
    onPingMessage(message) {
        this.sendMessage(lib_pixelstreamingcommon_ue5_7_1.MessageHelpers.createMessage(lib_pixelstreamingcommon_ue5_7_1.Messages.pong, { time: message.time }));
    }
}
exports.SFUConnection = SFUConnection;
//# sourceMappingURL=SFUConnection.js.map