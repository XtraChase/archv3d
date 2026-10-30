import { ITransport } from './ITransport';
import { EventEmitter } from '../Event/EventEmitter';
declare global {
    interface WebSocket {
        onmessagebinary?(event?: MessageEvent): void;
    }
}
/**
 * The controller for the WebSocket and all associated methods
 */
export declare class WebSocketTransport extends EventEmitter implements ITransport {
    WS_OPEN_STATE: number;
    webSocket?: WebSocket;
    protocols?: string | string[];
    /**
     * Constructs a new WebSocketTransport for browser contexts.
     * @param protocols - An optional string or list of strings to pass to the new websocket protocols param
     */
    constructor(protocols?: string | string[]);
    /**
     * Sends a message over the websocket.
     * @param msg - The message to send.
     */
    sendMessage(msg: string): void;
    onMessage?: (msg: string) => void;
    /**
     * Connect to the signaling server
     * @param connectionURL - The Address of the signaling server
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
     * Handles what happens when a message is received in binary form
     * @param event - Message Received
     */
    handleOnMessageBinary(event: MessageEvent<Blob>): void;
    /**
     * Handles what happens when a message is received
     * @param event - Message Received
     */
    handleOnMessage(event: MessageEvent): void;
    /**
     * Handles when the Websocket is opened
     */
    handleOnOpen(): void;
    /**
     * Handles when there is an error on the websocket
     */
    handleOnError(): void;
    /**
     * Handles when the Websocket is closed
     * @param event - Close Event
     */
    handleOnClose(event: CloseEvent): void;
}
