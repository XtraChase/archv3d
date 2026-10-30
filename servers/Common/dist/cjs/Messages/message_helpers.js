"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessage = createMessage;
exports.validateMessage = validateMessage;
const Logger_1 = require("../Logger/Logger");
const message_registry_1 = require("./message_registry");
/**
 * A helper for creating signalling messages. Takes in optional given parameters and
 * includes them in a message object with the 'type' field set properly for the message
 * type supplied.
 * @param messageType - A message type from MessageRegistry that indicates the type of message to create.
 * @param params - An optional object whose fields are added to the newly created message.
 * @returns The resulting message object.
 */
function createMessage(messageType, params) {
    const message = messageType.create();
    message.type = messageType.typeName;
    if (params) {
        messageType.mergePartial(message, params);
    }
    return message;
}
/**
 * Tests that the supplied message is valid. That is contains all expected fields and
 * doesn't contain any unknown fields.
 * @param msg - The message object to test.
 * @returns The message type from MessageRegistry of the supplied message object if it's valid, or null if invalid.
 */
function validateMessage(msg) {
    let valid = true;
    if (!msg.type) {
        Logger_1.Logger.Error(`Parsed message has no type. Rejected. ${JSON.stringify(msg)}`);
        return null;
    }
    const messageType = message_registry_1.MessageRegistry[msg.type];
    if (!messageType) {
        Logger_1.Logger.Error(`Message is of an unknown type: "${msg.type}". Rejected.`);
        return null;
    }
    if (messageType.fields) {
        for (const field of messageType.fields) {
            if (!field.opt) {
                if (!Object.prototype.hasOwnProperty.call(msg, field.name)) {
                    Logger_1.Logger.Error(`Message "${msg.type}"" is missing required field "${field.name}". Rejected.`);
                    valid = false;
                }
            }
        }
    }
    for (const fieldName in msg) {
        const found = messageType.fields.find((field) => field.name === fieldName);
        if (!found) {
            Logger_1.Logger.Error(`Message "${msg.type}" contains unknown field "${fieldName}". Rejected.`);
            valid = false;
        }
    }
    return valid ? messageType : null;
}
//# sourceMappingURL=message_helpers.js.map