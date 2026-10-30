/**
 * All Pixel Streaming messages should adhere to this interface.
 */
export interface BaseMessage {
    type: string;
    playerId?: string;
}
