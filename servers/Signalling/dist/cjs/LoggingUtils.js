"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logIncoming = logIncoming;
exports.logOutgoing = logOutgoing;
exports.logForward = logForward;
exports.createHandlerListener = createHandlerListener;
const Logger_1 = require("./Logger");
/**
 * Call to log messages received on a connection that we will handle here at the server.
 * Do not call this for messages being forwarded to another connection.
 * @param recvr - IMessageLogger The connection the message was received on.
 */
function logIncoming(recvr, message) {
    const logObj = {
        event: 'proto_message',
        direction: 'incoming',
        receiver: recvr.getReadableIdentifier(),
        protoMessage: message
    };
    Logger_1.Logger.info(logObj);
}
/**
 * Call to log messages created here at the server and being sent to the connection.
 * Do not call this for messages being forwarded to this connection.
 * @param sender - IMessageLogger The connection the message is being sent to.
 */
function logOutgoing(sender, message) {
    Logger_1.Logger.info({
        event: 'proto_message',
        direction: 'outgoing',
        sender: sender.getReadableIdentifier(),
        protoMessage: message
    });
}
/**
 * Call this for messages being forwarded to this connection. That is messages received on
 * one connection and being sent to another with only minor changes being made.
 * @param recvr - The connection the message was received on.
 * @param target - The connection the message is being sent to.
 */
function logForward(recvr, target, message) {
    Logger_1.Logger.info({
        event: 'proto_message',
        direction: 'forward',
        receiver: recvr.getReadableIdentifier(),
        target: target.getReadableIdentifier(),
        protoMessage: message
    });
}
/**
 * We don't want to log every incoming and outgoing messages. This is because some messages are simply
 * forwarded to other connections. This results in duplicated spam. So we only want to log incoming
 * messages that we handle internally, and any messages that we forward we only log once for the recv
 * and send events.
 * This creation method allows a simple way to enforce this. Any events we handle directly will
 * be preceded by the logging call.
 */
function createHandlerListener(obj, handler) {
    return (message) => {
        logIncoming(obj, message);
        handler.bind(obj)(message);
    };
}
//# sourceMappingURL=LoggingUtils.js.map