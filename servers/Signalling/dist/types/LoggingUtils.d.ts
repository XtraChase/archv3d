import { BaseMessage } from '@epicgames-ps/lib-pixelstreamingcommon-ue5.7';
export interface IProtoLogObj {
    event: string;
    direction: string;
    sender?: string;
    receiver?: string;
    target?: string;
    protoMessage: BaseMessage;
}
/**
 * Most methods in here rely on connections implementing this interface so we can identify
 * who is sending or receiving etc.
 */
export interface IMessageLogger {
    getReadableIdentifier(): string;
}
/**
 * Call to log messages received on a connection that we will handle here at the server.
 * Do not call this for messages being forwarded to another connection.
 * @param recvr - IMessageLogger The connection the message was received on.
 */
export declare function logIncoming(recvr: IMessageLogger, message: BaseMessage): void;
/**
 * Call to log messages created here at the server and being sent to the connection.
 * Do not call this for messages being forwarded to this connection.
 * @param sender - IMessageLogger The connection the message is being sent to.
 */
export declare function logOutgoing(sender: IMessageLogger, message: BaseMessage): void;
/**
 * Call this for messages being forwarded to this connection. That is messages received on
 * one connection and being sent to another with only minor changes being made.
 * @param recvr - The connection the message was received on.
 * @param target - The connection the message is being sent to.
 */
export declare function logForward(recvr: IMessageLogger, target: IMessageLogger, message: BaseMessage): void;
/**
 * We don't want to log every incoming and outgoing messages. This is because some messages are simply
 * forwarded to other connections. This results in duplicated spam. So we only want to log incoming
 * messages that we handle internally, and any messages that we forward we only log once for the recv
 * and send events.
 * This creation method allows a simple way to enforce this. Any events we handle directly will
 * be preceded by the logging call.
 */
export declare function createHandlerListener(obj: IMessageLogger, handler: (message: any) => void): (message: BaseMessage) => void;
