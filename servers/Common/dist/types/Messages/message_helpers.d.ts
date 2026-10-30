import { IMessageType } from '@protobuf-ts/runtime';
import { BaseMessage } from './base_message';
/**
 * A helper for creating signalling messages. Takes in optional given parameters and
 * includes them in a message object with the 'type' field set properly for the message
 * type supplied.
 * @param messageType - A message type from MessageRegistry that indicates the type of message to create.
 * @param params - An optional object whose fields are added to the newly created message.
 * @returns The resulting message object.
 */
export declare function createMessage(messageType: IMessageType<BaseMessage>, params?: object): BaseMessage;
/**
 * Tests that the supplied message is valid. That is contains all expected fields and
 * doesn't contain any unknown fields.
 * @param msg - The message object to test.
 * @returns The message type from MessageRegistry of the supplied message object if it's valid, or null if invalid.
 */
export declare function validateMessage(msg: BaseMessage): IMessageType<BaseMessage> | null;
