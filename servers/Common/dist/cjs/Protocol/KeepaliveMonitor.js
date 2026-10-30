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
exports.KeepaliveMonitor = void 0;
// Copyright Epic Games, Inc. All Rights Reserved.
const Messages = __importStar(require("../Messages/signalling_messages"));
const MessageHelpers = __importStar(require("../Messages/message_helpers"));
/**
 * Used to regularly ping a protocol connection to make sure the connection is still good and open.
 * When the pong doesn't come in response to a ping in time a callback is fired that can be handed
 * by the owner.
 */
class KeepaliveMonitor {
    /**
     * Gets the Round Trip Time of the current connection in milliseconds.
     */
    get RTT() {
        return this.rtt;
    }
    /**
     * Creates a new monitor and starts the ping timer. If a pong does not come back by the time we want
     * to send a second ping then the connection is considered dead and the onTimeout callback is fired.
     * @param protocol - The connection that we want to monitor.
     * @param timeout - The time in milliseconds between ping messages.
     */
    constructor(protocol, timeout) {
        this.alive = false;
        this.rtt = 0;
        this.protocol = protocol;
        this.timeout = timeout;
        this.onResponse = this.onHeartbeatResponse.bind(this);
        this.protocol.transport.on('close', this.stop.bind(this));
        this.start();
    }
    start() {
        this.alive = true;
        this.protocol.on('pong', this.onResponse);
        this.keepalive = setInterval(this.sendHeartbeat.bind(this), this.timeout);
    }
    stop() {
        clearInterval(this.keepalive);
        this.protocol.off('pong', this.onResponse);
    }
    sendHeartbeat() {
        var _a;
        // if we never got a response from the last heartbeat, assume the connection is dead and timeout
        if (this.alive === false) {
            (_a = this.onTimeout) === null || _a === void 0 ? void 0 : _a.call(this);
            return;
        }
        // mark the connection as temporarily dead until we get a response from the ping
        this.alive = false;
        this.protocol.sendMessage(MessageHelpers.createMessage(Messages.ping, { time: new Date().getTime() }));
    }
    onHeartbeatResponse(pongMsg) {
        // we got a pong response from the other side, the connection is good.
        // we also store the round trip time if anyone is curious
        this.rtt = new Date().getTime() - pongMsg.time;
        this.alive = true;
    }
}
exports.KeepaliveMonitor = KeepaliveMonitor;
//# sourceMappingURL=KeepaliveMonitor.js.map