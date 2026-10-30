import { IMessageType } from '@protobuf-ts/runtime';
import { BaseMessage } from './base_message';
/**
 * A map of all the supported signalling messages in the Pixel Streaming
 * signalling protocol. This allows mapping of signalling message names
 * to actual message types.
 */
export declare const MessageRegistry: Record<string, IMessageType<BaseMessage>>;
