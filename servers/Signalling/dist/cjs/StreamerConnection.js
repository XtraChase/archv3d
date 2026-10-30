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
exports.StreamerConnection = void 0;
const lib_pixelstreamingcommon_ue5_7_1 = require("@epicgames-ps/lib-pixelstreamingcommon-ue5.7");
const Utils_1 = require("./Utils");
const Logger_1 = require("./Logger");
const LogUtils = __importStar(require("./LoggingUtils"));
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
class StreamerConnection extends lib_pixelstreamingcommon_ue5_7_1.EventEmitter {
    /**
     * Initializes a new connection with given and sane values. Adds listeners for the
     * websocket close and error and will emit a disconnected event when disconneted.
     * @param server - The signalling server object that spawned this streamer.
     * @param ws - The websocket coupled to this streamer connection.
     * @param remoteAddress - The remote address of this connection. Only used as display.
     */
    constructor(server, ws, remoteAddress) {
        super();
        this.server = server;
        this.streamerId = '';
        this.transport = new lib_pixelstreamingcommon_ue5_7_1.WebSocketTransportNJS(ws);
        this.protocol = new lib_pixelstreamingcommon_ue5_7_1.SignallingProtocol(this.transport);
        this.streaming = false;
        this.remoteAddress = remoteAddress;
        this.maxSubscribers = 0;
        this.subscribers = new Set();
        this.transport.on('error', this.onTransportError.bind(this));
        this.transport.on('close', this.onTransportClose.bind(this));
        this.registerMessageHandlers();
        this.protocol.on('unhandled', (message) => {
            Logger_1.Logger.warn(`Unhandled streamer protocol message: ${JSON.stringify(message)}`);
        });
    }
    /**
     * Returns an identifier that is displayed in logs.
     * @returns A string describing this connection.
     */
    getReadableIdentifier() {
        return this.streamerId;
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
     * @returns An IStreamerInfo object containing viewable information about this connection.
     */
    getStreamerInfo() {
        return {
            streamerId: this.streamerId,
            type: 'Streamer',
            streaming: this.streaming,
            remoteAddress: this.remoteAddress,
            subscribers: this.server.playerRegistry
                .listPlayers()
                .filter((player) => player.subscribedStreamer == this)
                .map((player) => player.getPlayerInfo())
        };
    }
    registerMessageHandlers() {
        /* eslint-disable @typescript-eslint/unbound-method */
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.endpointId.typeName, LogUtils.createHandlerListener(this, this.onEndpointId));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.disconnectPlayer.typeName, LogUtils.createHandlerListener(this, this.onDisconnectPlayerRequest));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.layerPreference.typeName, LogUtils.createHandlerListener(this, this.onLayerPreference));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.ping.typeName, LogUtils.createHandlerListener(this, this.onPingMessage));
        /* eslint-enable @typescript-eslint/unbound-method */
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.offer.typeName, this.forwardMessage.bind(this));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.answer.typeName, this.forwardMessage.bind(this));
        this.protocol.on(lib_pixelstreamingcommon_ue5_7_1.Messages.iceCandidate.typeName, this.forwardMessage.bind(this));
    }
    forwardMessage(message) {
        if (!message.playerId) {
            Logger_1.Logger.warn(`No playerId specified, cannot forward message: ${(0, Utils_1.stringify)(message)}`);
        }
        else {
            const player = this.server.playerRegistry.get(message.playerId);
            if (player) {
                delete message.playerId;
                LogUtils.logForward(this, player, message);
                player.protocol.sendMessage(message);
            }
        }
    }
    onTransportError(error) {
        Logger_1.Logger.error(`Streamer (${this.streamerId}) transport error ${error.message}`);
    }
    onTransportClose() {
        Logger_1.Logger.info(`Streamer '${this.streamerId}' - websocket disconnected.`);
        this.emit('disconnect');
    }
    onEndpointId(_message) {
        this.streaming = true; // we're ready to stream when we id ourselves
    }
    onDisconnectPlayerRequest(message) {
        if (message.playerId) {
            const player = this.server.playerRegistry.get(message.playerId);
            if (player) {
                player.protocol.disconnect(1011, message.reason);
            }
        }
    }
    onLayerPreference(message) {
        this.emit('layer_preference', message);
    }
    onPingMessage(message) {
        this.sendMessage(lib_pixelstreamingcommon_ue5_7_1.MessageHelpers.createMessage(lib_pixelstreamingcommon_ue5_7_1.Messages.pong, { time: message.time }));
    }
}
exports.StreamerConnection = StreamerConnection;
//# sourceMappingURL=StreamerConnection.js.map