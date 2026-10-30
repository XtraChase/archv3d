import { ITransport } from '../Transport/ITransport';
import { EventEmitter } from '../Event/EventEmitter';
import { BaseMessage } from '../Messages/base_message';
/**
 * Signalling protocol for handling messages from the signalling server.
 *
 * Listen on this emitter for messages. Message type is the name of the event to listen for.
 * Example:
 *      signallingProtocol.on('config', (message: Messages.config) =\> console.log(`Got a config message: ${message}`)));
 *
 * The transport in this class will also emit on message events.
 *
 * Events emitted on transport:
 *   message:
 *      Emitted any time a message is received by the transport. Listen on this if
 *      you wish to capture all messages, rather than specific messages on
 *      'messageHandlers'.
 *
 *   out:
 *      Emitted when sending a message out on the transport. Similar to 'message' but
 *      only for when messages are sent from this endpoint. Useful for debugging.
 */
export declare class SignallingProtocol extends EventEmitter {
    static get SIGNALLING_VERSION(): string;
    transport: ITransport;
    constructor(transport: ITransport);
    /**
     * Asks the transport to connect to the given URL.
     * @param url - The url to connect to.
     * @returns True if the connection call succeeded.
     */
    connect(url: string): boolean;
    /**
     * Asks the transport to disconnect from any connection it might have.
     * @param code - An optional disconnection code.
     * @param reason - An optional descriptive string for the disconnect reason.
     */
    disconnect(code?: number, reason?: string): void;
    /**
     * Returns true if the transport is connected and ready to send/receive messages.
     * @returns True if the protocol is connected.
     */
    isConnected(): boolean;
    /**
     * Passes a message to the transport to send to the other end.
     * @param msg - The message to send.
     */
    sendMessage(msg: BaseMessage): void;
}
