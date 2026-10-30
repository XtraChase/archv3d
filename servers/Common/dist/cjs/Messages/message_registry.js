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
exports.MessageRegistry = void 0;
const Messages = __importStar(require("./signalling_messages"));
/**
 * A map of all the supported signalling messages in the Pixel Streaming
 * signalling protocol. This allows mapping of signalling message names
 * to actual message types.
 */
exports.MessageRegistry = {
    answer: Messages.answer,
    config: Messages.config,
    disconnectPlayer: Messages.disconnectPlayer,
    endpointId: Messages.endpointId,
    endpointIdConfirm: Messages.endpointIdConfirm,
    iceCandidate: Messages.iceCandidate,
    identify: Messages.identify,
    listStreamers: Messages.listStreamers,
    offer: Messages.offer,
    ping: Messages.ping,
    playerConnected: Messages.playerConnected,
    playerCount: Messages.playerCount,
    playerDisconnected: Messages.playerDisconnected,
    pong: Messages.pong,
    stats: Messages.stats,
    streamerDisconnected: Messages.streamerDisconnected,
    streamerList: Messages.streamerList,
    subscribe: Messages.subscribe,
    unsubscribe: Messages.unsubscribe,
    layerPreference: Messages.layerPreference,
    dataChannelRequest: Messages.dataChannelRequest,
    peerDataChannels: Messages.peerDataChannels,
    peerDataChannelsReady: Messages.peerDataChannelsReady,
    streamerDataChannels: Messages.streamerDataChannels,
    startStreaming: Messages.startStreaming,
    stopStreaming: Messages.stopStreaming
};
//# sourceMappingURL=message_registry.js.map