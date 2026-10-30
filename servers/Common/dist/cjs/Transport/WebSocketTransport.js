"use strict";
// Copyright Epic Games, Inc. All Rights Reserved.
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketTransport = void 0;
const Logger_1 = require("../Logger/Logger");
const EventEmitter_1 = require("../Event/EventEmitter");
/**
 * The controller for the WebSocket and all associated methods
 */
class WebSocketTransport extends EventEmitter_1.EventEmitter {
    /**
     * Constructs a new WebSocketTransport for browser contexts.
     * @param protocols - An optional string or list of strings to pass to the new websocket protocols param
     */
    constructor(protocols) {
        super();
        this.WS_OPEN_STATE = 1;
        this.protocols = protocols;
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
     * @returns If there is a connection
     */
    connect(connectionURL) {
        Logger_1.Logger.Info(connectionURL);
        try {
            this.webSocket = new WebSocket(connectionURL, this.protocols);
            this.webSocket.onopen = (_) => this.handleOnOpen();
            this.webSocket.onerror = (_) => this.handleOnError();
            this.webSocket.onclose = (event) => this.handleOnClose(event);
            this.webSocket.onmessage = (event) => this.handleOnMessage(event);
            this.webSocket.onmessagebinary = (event) => this.handleOnMessageBinary(event);
            return true;
        }
        catch (error) {
            Logger_1.Logger.Error(error);
            return false;
        }
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
        return !!this.webSocket && this.webSocket.readyState != WebSocket.CLOSED;
    }
    /**
     * Handles what happens when a message is received in binary form
     * @param event - Message Received
     */
    handleOnMessageBinary(event) {
        // if the event is empty return
        if (!event || !event.data) {
            return;
        }
        // handle the binary and then handle the message
        event.data
            .text()
            .then((messageString) => {
            // build a new message
            const constructedMessage = new MessageEvent('messageFromBinary', {
                data: messageString
            });
            // send the new stringified event back into `onmessage`
            this.handleOnMessage(constructedMessage);
        })
            .catch((error) => {
            Logger_1.Logger.Error(`Failed to parse binary blob from websocket, reason: ${error.message}`);
        });
    }
    /**
     * Handles what happens when a message is received
     * @param event - Message Received
     */
    handleOnMessage(event) {
        // Check if websocket message is binary, if so, stringify it.
        if (event.data && event.data instanceof Blob) {
            this.handleOnMessageBinary(event);
            return;
        }
        if (this.onMessage) {
            this.onMessage(event.data);
        }
    }
    /**
     * Handles when the Websocket is opened
     */
    handleOnOpen() {
        Logger_1.Logger.Info('Connected to the signalling server via WebSocket');
        this.emit('open');
    }
    /**
     * Handles when there is an error on the websocket
     */
    handleOnError() {
        //Logger.Error(Logger.GetStackTrace(), 'WebSocket error');
        this.emit('error');
    }
    /**
     * Handles when the Websocket is closed
     * @param event - Close Event
     */
    handleOnClose(event) {
        Logger_1.Logger.Info('Disconnected to the signalling server via WebSocket: ' +
            JSON.stringify(event.code) +
            ' - ' +
            event.reason);
        this.emit('close', event);
    }
}
exports.WebSocketTransport = WebSocketTransport;
//# sourceMappingURL=WebSocketTransport.js.map