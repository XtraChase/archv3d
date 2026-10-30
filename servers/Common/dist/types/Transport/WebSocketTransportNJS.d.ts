import { ITransport } from './ITransport';
import { EventEmitter } from '../Event/EventEmitter';
import WebSocket from 'ws';
/**
 * An implementation of WebSocketTransport from pixelstreamingcommon that supports node.js websockets
 * This is needed because of the slight differences between the 'ws' node.js package and the websockets
 * supported in the browsers.
 * Do not use this code in a browser use 'WebSocketTransport' instead.
 */
export declare class WebSocketTransportNJS extends EventEmitter implements ITransport {
    WS_OPEN_STATE: number;
    webSocket?: WebSocket;
    protocols?: string | string[];
    /**
     * Constructs a new instance of a WebSocketTransport for node contexts.
     * @param existingSocket - An existing WebSocket to use.
     */
    constructor(existingSocket: WebSocket);
    /**
     * Constructs a new instance of a WebSocketTransport for node contexts.
     * @param protocols - A protocol or list of protocols to pass to the new websocket.
     */
    constructor(protocols: string | string[]);
    /**
     * Constructs a new instance of a WebSocketTransport for node contexts.
     */
    constructor();
    /**
     * Sends a message over the websocket.
     * @param msg - The message to send.
     */
    sendMessage(msg: string): void;
    onMessage?: (msg: string) => void;
    /**
     * Connect to the signaling server
     * @param connectionURL - The Address of the signaling server
     * @param protocols - An optional string or list of strings to pass to the new websocket protocols param
     * @returns If there is a connection
     */
    connect(connectionURL: string): boolean;
    /**
     * Disconnect this transport.
     * @param code - An optional disconnect code.
     * @param reason - A descriptive string for the disconnect reason.
     */
    disconnect(code?: number, reason?: string): void;
    /**
     * Should return true when the transport is connected and ready to send/receive messages.
     * @returns True if the transport is connected.
     */
    isConnected(): boolean;
    /**
     * Handles what happens when a message is received
     * @param event - Message Received
     */
    handleOnMessage(event: WebSocket.MessageEvent): void;
    /**
     * Handles when the Websocket is opened
     * @param event - Not Used
     */
    handleOnOpen(event: WebSocket.Event): void;
    /**
     * Handles when there is an error on the websocket
     * @param event - Error Payload
     */
    handleOnError(event: WebSocket.ErrorEvent): void;
    /**
     * Handles when the Websocket is closed
     * @param event - Close Event
     */
    handleOnClose(event: WebSocket.CloseEvent): void;
    /**
     * Closes the Websocket connection
     */
    close(): void;
    private setupSocketHandlers;
}
