"use strict";
// Copyright Epic Games, Inc. All Rights Reserved.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketTransportNJS = void 0;
const EventEmitter_1 = require("../Event/EventEmitter");
const ws_1 = __importDefault(require("ws"));
/**
 * An implementation of WebSocketTransport from pixelstreamingcommon that supports node.js websockets
 * This is needed because of the slight differences between the 'ws' node.js package and the websockets
 * supported in the browsers.
 * Do not use this code in a browser use 'WebSocketTransport' instead.
 */
class WebSocketTransportNJS extends EventEmitter_1.EventEmitter {
    constructor(argument) {
        super();
        this.WS_OPEN_STATE = 1;
        if (argument instanceof ws_1.default) {
            this.webSocket = argument;
            this.setupSocketHandlers();
            this.emit('open');
        }
        else if (argument) {
            this.protocols = argument;
        }
    }
    /**
     * Sends a message over the websocket.
     * @param msg - The message to send.
     */
    sendMessage(msg) {
        if (this.webSocket) {
            this.webSocket.send(msg);
        }
    }
    /**
     * Connect to the signaling server
     * @param connectionURL - The Address of the signaling server
     * @param protocols - An optional string or list of strings to pass to the new websocket protocols param
     * @returns If there is a connection
     */
    connect(connectionURL) {
        this.webSocket = new ws_1.default(connectionURL, this.protocols);
        this.setupSocketHandlers();
        return true;
    }
    /**
     * Disconnect this transport.
     * @param code - An optional disconnect code.
     * @param reason - A descriptive string for the disconnect reason.
     */
    disconnect(code, reason) {
        if (this.webSocket) {
            this.webSocket.close(code, reason);
        }
    }
    /**
     * Should return true when the transport is connected and ready to send/receive messages.
     * @returns True if the transport is connected.
     */
    isConnected() {
        return !!this.webSocket && this.webSocket.readyState != ws_1.default.CLOSED;
    }
    /**
     * Handles what happens when a message is received
     * @param event - Message Received
     */
    handleOnMessage(event) {
        if (this.onMessage) {
            this.onMessage(event.data);
        }
    }
    /**
     * Handles when the Websocket is opened
     * @param event - Not Used
     */
    handleOnOpen(event) {
        this.emit('open', event);
    }
    /**
     * Handles when there is an error on the websocket
     * @param event - Error Payload
     */
    handleOnError(event) {
        this.emit('error', event);
    }
    /**
     * Handles when the Websocket is closed
     * @param event - Close Event
     */
    handleOnClose(event) {
        this.emit('close', event);
    }
    /**
     * Closes the Websocket connection
     */
    close() {
        var _a;
        (_a = this.webSocket) === null || _a === void 0 ? void 0 : _a.close();
    }
    setupSocketHandlers() {
        if (this.webSocket) {
            this.webSocket.addEventListener('open', this.handleOnOpen.bind(this));
            this.webSocket.addEventListener('error', this.handleOnError.bind(this));
            this.webSocket.addEventListener('close', this.handleOnClose.bind(this));
            this.webSocket.addEventListener('message', this.handleOnMessage.bind(this));
        }
    }
}
exports.WebSocketTransportNJS = WebSocketTransportNJS;
//# sourceMappingURL=WebSocketTransportNJS.js.map