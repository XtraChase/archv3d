import type { BinaryWriteOptions } from "@protobuf-ts/runtime";
import type { IBinaryWriter } from "@protobuf-ts/runtime";
import type { BinaryReadOptions } from "@protobuf-ts/runtime";
import type { IBinaryReader } from "@protobuf-ts/runtime";
import type { PartialMessage } from "@protobuf-ts/runtime";
import { MessageType } from "@protobuf-ts/runtime";
/**
 * *
 * This is just a helper message type that allows us to use a "base interface"
 * in code to describe that all messages should at least have a 'type field'.
 *
 * @generated from protobuf message base_message
 */
export interface base_message {
    /**
     * The type of the message.
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
}
/**
 * *
 * This is a user defined structure that is sent as part of the `config`
 * message. Left empty here because everything is optional.
 *
 * @generated from protobuf message peerConnectionOptions
 */
export interface peerConnectionOptions {
}
/**
 * *
 * A config message is sent to each connecting peer when it connects to
 * describe to them the setup of the signalling server they're
 * connecting to.
 *
 * @generated from protobuf message config
 */
export interface config {
    /**
     * Should always be 'config'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The user defined peer connnection options
     *
     * @generated from protobuf field: peerConnectionOptions peerConnectionOptions = 2;
     */
    peerConnectionOptions?: peerConnectionOptions;
    /**
     * The signalling protocol version the signalling server is using
     *
     * @generated from protobuf field: optional string protocolVersion = 3;
     */
    protocolVersion?: string;
}
/**
 * *
 * A request for a new streamer to give itself an ID. The flow for these
 * messages should be connect->identify->endpointId->endpointIdConfirm
 *
 * @generated from protobuf message identify
 */
export interface identify {
    /**
     * Should always be 'identify'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
}
/**
 * *
 * Message is consumed by the Signalling Server. Specifies an id for the
 * streamer. This is used to uniquely identify multiple streamers connected
 * to the same Signalling Server.
 * Note: to preserve backward compatibility when Streamer IDs were optional,
 * when a Streamer first connects it is assigned a temporary ID which
 * allows use of older Streamers if needed.
 * Note: Streamer IDs must be unique and so if the ID provided here clashes
 * with an existing ID, the ID may be altered slightly (usually just an
 * appended number). The streamer will be sent an `endpointIdConfirm`
 * message to notify it of it's final ID.
 *
 * @generated from protobuf message endpointId
 */
export interface endpointId {
    /**
     * Should always be 'endpointId'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The requested ID of the streamer.
     *
     * @generated from protobuf field: string id = 2;
     */
    id: string;
    /**
     * The signalling protocol version the streamer is using
     *
     * @generated from protobuf field: optional string protocolVersion = 3;
     */
    protocolVersion?: string;
}
/**
 * *
 * A response to `endpointId` that will notify the streamer of its final
 * ID given. Since streamer IDs must be unique the requested ID may not be
 * available and may need to be altered.
 *
 * @generated from protobuf message endpointIdConfirm
 */
export interface endpointIdConfirm {
    /**
     * Should always be 'endpointIdConfirm'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The final ID of the streamer.
     *
     * @generated from protobuf field: string committedId = 2;
     */
    committedId: string;
}
/**
 * *
 * Message is used to communicate to players that the streamer it is currently
 * subscribed to is changing its ID. This allows players to keep track of it's
 * currently subscribed streamer and allow auto reconnects to the correct
 * streamer. This happens if a streamer sends an `endpointID` message after it
 * already has an ID assigned. (Can happen if it is late to respond to the
 * `identify` message and is auto assigned a legacy ID.)
 *
 * @generated from protobuf message streamerIdChanged
 */
export interface streamerIdChanged {
    /**
     * Should always be 'streamerIdChanged'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The new ID of the streamer.
     *
     * @generated from protobuf field: string newID = 2;
     */
    newID: string;
}
/**
 * *
 * A request to the signalling server to send the player a list of
 * available streamers it could possibly subscribe to.
 *
 * @generated from protobuf message listStreamers
 */
export interface listStreamers {
    /**
     * Should always be 'listStreamers'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
}
/**
 * *
 * Message is a reply to `listStreamers` from a player. Replies with a list of
 * currently active streamers connected to this server.
 *
 * @generated from protobuf message streamerList
 */
export interface streamerList {
    /**
     * Should always be 'streamerList'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * A list of streamer IDs active on the server.
     *
     * @generated from protobuf field: repeated string ids = 2;
     */
    ids: string[];
}
/**
 * *
 * Message is consumed by the signalling server. Tells the signalling server
 * that the player requests to subscribe to the given stream.
 *
 * @generated from protobuf message subscribe
 */
export interface subscribe {
    /**
     * Should always be 'subscribe'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The ID of the streamer the player wishes to subscribe to.
     *
     * @generated from protobuf field: string streamerId = 2;
     */
    streamerId: string;
}
/**
 * *
 * Message is consumed by the signalling server. Tells the signalling server
 * that the player wishes to unsubscribe from the current stream. The player
 * must have previously used the `subscribe` message for this to have any effect.
 *
 * @generated from protobuf message unsubscribe
 */
export interface unsubscribe {
    /**
     * Should always be 'unsubscribe'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
}
/**
 * *
 * Sent in response to a subscribe message when something goes wrong.
 *
 * @generated from protobuf message subscribeFailed
 */
export interface subscribeFailed {
    /**
     * Should always be 'subscribeFailed'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * A description of what went wrong.
     *
     * @generated from protobuf field: string message = 2;
     */
    message: string;
}
/**
 * *
 * A message sent to a streamer to notify it that a player has just
 * subscribed to it.
 *
 * @generated from protobuf message playerConnected
 */
export interface playerConnected {
    /**
     * Should always be 'playerConnected'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * True if the player should be given a datachannel for stream control purposes.
     *
     * @generated from protobuf field: bool dataChannel = 2;
     */
    dataChannel: boolean;
    /**
     * True if the player connected is an SFU
     *
     * @generated from protobuf field: bool sfu = 3;
     */
    sfu: boolean;
    /**
     * The ID of the player that connected.
     *
     * @generated from protobuf field: string playerId = 5;
     */
    playerId: string;
}
/**
 * *
 * Message is used to notify a streamer that a player has
 * unsubscribed/disconnected from the stream.
 *
 * @generated from protobuf message playerDisconnected
 */
export interface playerDisconnected {
    /**
     * Should always be 'playerDisconnected'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The ID of the player that disconnected.
     *
     * @generated from protobuf field: string playerId = 2;
     */
    playerId: string;
}
/**
 * *
 * An offer message is an offer of a WebRTC stream.
 * When a player subscribes to a streamer the streamer will offer the
 * stream to the new player.
 *
 * @generated from protobuf message offer
 */
export interface offer {
    /**
     * Should always be 'offer'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The SDP payload from WebRTC
     *
     * @generated from protobuf field: string sdp = 2;
     */
    sdp: string;
    /**
     * If being sent to a player this should be a valid player ID
     *
     * @generated from protobuf field: optional string playerId = 3;
     */
    playerId?: string;
    /**
     * Indiates that this offer is coming from an SFU.
     *
     * @generated from protobuf field: optional bool sfu = 4;
     */
    sfu?: boolean;
    /**
     * Indicates that the streamer is multiplexing data channels
     *
     * @generated from protobuf field: optional bool multiplex = 5;
     */
    multiplex?: boolean;
    /**
     * Indicates the scalability mode of the video stream
     *
     * @generated from protobuf field: optional string scalabilityMode = 6;
     */
    scalabilityMode?: string;
}
/**
 * *
 * This is a response to an `offer` message. It contains the answer `SDP`.
 * Part of the normal subscribe flow. A peer will subscribe to a streamer
 * and depending on whether `offer_to_receive` is set, one peer will make
 * an offer and the other should answer.
 *
 * @generated from protobuf message answer
 */
export interface answer {
    /**
     * Should always be 'answer'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The WebRTC SDP payload
     *
     * @generated from protobuf field: string sdp = 2;
     */
    sdp: string;
    /**
     * If being sent to a player this should be set to a valid player ID.
     *
     * @generated from protobuf field: optional string playerId = 3;
     */
    playerId?: string;
    /**
     * Specifies the minimum bitrate requested for streams.
     *
     * @generated from protobuf field: optional int32 minBitrateBps = 4;
     */
    minBitrateBps?: number;
    /**
     * Specifies the maximum bitrate requested for streams.
     *
     * @generated from protobuf field: optional int32 maxBitrateBps = 5;
     */
    maxBitrateBps?: number;
}
/**
 * *
 * A submessage that contains data from a WebRTC ICE candidate.
 *
 * @generated from protobuf message iceCandidateData
 */
export interface iceCandidateData {
    /**
     * @generated from protobuf field: string candidate = 1;
     */
    candidate: string;
    /**
     * @generated from protobuf field: string sdpMid = 2;
     */
    sdpMid: string;
    /**
     * @generated from protobuf field: int32 sdpMLineIndex = 3;
     */
    sdpMLineIndex: number;
    /**
     * @generated from protobuf field: optional string usernameFragment = 4;
     */
    usernameFragment?: string;
}
/**
 * *
 * A single ICE candidate entry from WebRTC. Notifies a peer of a possible
 * connection option to another peer.
 *
 * @generated from protobuf message iceCandidate
 */
export interface iceCandidate {
    /**
     * Should always be 'iceCandidate'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The ICE candidate data from WebRTC
     *
     * @generated from protobuf field: iceCandidateData candidate = 2;
     */
    candidate?: iceCandidateData;
    /**
     * If being sent to a player this should be a valid player ID.
     *
     * @generated from protobuf field: optional string playerId = 3;
     */
    playerId?: string;
}
/**
 * *
 * Message is consumed by the Signalling Server. Requests that the
 * signalling server disconnect the given player matching the player ID.
 *
 * @generated from protobuf message disconnectPlayer
 */
export interface disconnectPlayer {
    /**
     * Should always be 'disconnectPlayer'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The ID of the player to disconnect.
     *
     * @generated from protobuf field: string playerId = 2;
     */
    playerId: string;
    /**
     * An optional reason string to send to the player.
     *
     * @generated from protobuf field: optional string reason = 3;
     */
    reason?: string;
}
/**
 * *
 * A keepalive ping message used to test that the connection is still open.
 *
 * @generated from protobuf message ping
 */
export interface ping {
    /**
     * Should always be 'ping'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The current time
     *
     * @generated from protobuf field: int32 time = 2;
     */
    time: number;
}
/**
 * *
 * Message is a reply to `ping` from a streamer. Replies with the time from the
 * ping message.
 *
 * @generated from protobuf message pong
 */
export interface pong {
    /**
     * Should always be 'pong'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The echoed time from the ping message
     *
     * @generated from protobuf field: int32 time = 2;
     */
    time: number;
}
/**
 * *
 * Message is used to notify players when a Streamer disconnects from the
 * signalling server.
 *
 * @generated from protobuf message streamerDisconnected
 */
export interface streamerDisconnected {
    /**
     * Should always be 'streamerDisconnected'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
}
/**
 * *
 * Message is forwarded to a connected SFU. Sends a preferred layer index to a
 * connected SFU for a specified player. Useful for switching between SFU
 * quality layers to force a certain resolution/quality option either as part
 * of UX or testing.
 *
 * @generated from protobuf message layerPreference
 */
export interface layerPreference {
    /**
     * Should always be 'layerPreference'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The requested spatial layer
     *
     * @generated from protobuf field: int32 spatialLayer = 2;
     */
    spatialLayer: number;
    /**
     * The requested temporal layer
     *
     * @generated from protobuf field: int32 temporalLayer = 3;
     */
    temporalLayer: number;
    /**
     * The player ID this preference refers to
     *
     * @generated from protobuf field: string playerId = 4;
     */
    playerId: string;
}
/**
 * *
 * Message is forwarded to a connected SFU. Tells the SFU that the player
 * requests data channels to the streamer.
 *
 * @generated from protobuf message dataChannelRequest
 */
export interface dataChannelRequest {
    /**
     * Should always be 'dataChannelRequest'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
}
/**
 * *
 * Message is forwarded to a player. Sends information to the player about what
 * data channels to use for sending/receiving with the streamer.
 *
 * @generated from protobuf message peerDataChannels
 */
export interface peerDataChannels {
    /**
     * Should always be 'peerDataChannels'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The player ID this message refers to.
     *
     * @generated from protobuf field: string playerId = 2;
     */
    playerId: string;
    /**
     * The channel ID to use for sending data.
     *
     * @generated from protobuf field: int32 sendStreamId = 3;
     */
    sendStreamId: number;
    /**
     * The channel ID to use for receiving data.
     *
     * @generated from protobuf field: int32 recvStreamId = 4;
     */
    recvStreamId: number;
}
/**
 * *
 * Message is forwarded to a connected SFU. Tells the SFU that the player is
 * ready for data channels to be negotiated.
 *
 * @generated from protobuf message peerDataChannelsReady
 */
export interface peerDataChannelsReady {
    /**
     * Should always be 'peerDataChannelsReady'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
}
/**
 * *
 * Message is forwarded to the streamer. Sends a request to the streamer to
 * open up data channels for a given player.
 *
 * @generated from protobuf message streamerDataChannels
 */
export interface streamerDataChannels {
    /**
     * Should always be 'streamerDataChannels'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The SFU the player is connected to
     *
     * @generated from protobuf field: string sfuId = 2;
     */
    sfuId: string;
    /**
     * The channel ID to use for sending data.
     *
     * @generated from protobuf field: int32 sendStreamId = 3;
     */
    sendStreamId: number;
    /**
     * The channel ID to use for receiving data.
     *
     * @generated from protobuf field: int32 recvStreamId = 4;
     */
    recvStreamId: number;
}
/**
 * *
 * Sent by the SFU to indicate that it is now streaming.
 *
 * @generated from protobuf message startStreaming
 */
export interface startStreaming {
    /**
     * Should always be 'startStreaming'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
}
/**
 * *
 * Sent by the SFU to indicate that it is now no longer streaming.
 *
 * @generated from protobuf message stopStreaming
 */
export interface stopStreaming {
    /**
     * Should always be 'stopStreaming'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
}
/**
 * *
 * DEPRECATED Message is sent to players to indicate how many currently connected players
 * there are on this signalling server. (Note: This is mostly old behaviour and
 * is not influenced by multi streamers or who is subscribed to what streamer.
 * It just reports the number of players it knows about.)
 *
 * @generated from protobuf message playerCount
 */
export interface playerCount {
    /**
     * Should always be 'playerCount'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The number of players connected.
     *
     * @generated from protobuf field: int32 count = 2;
     */
    count: number;
}
/**
 * *
 * DEPRECATED Message is consumed by the signalling server. Will print out the provided
 * stats data on the console.
 *
 * @generated from protobuf message stats
 */
export interface stats {
    /**
     * Should always be 'stats'
     *
     * @generated from protobuf field: string type = 1;
     */
    type: string;
    /**
     * The stats data to echo.
     *
     * @generated from protobuf field: string data = 2;
     */
    data: string;
}
declare class base_message$Type extends MessageType<base_message> {
    constructor();
    create(value?: PartialMessage<base_message>): base_message;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: base_message): base_message;
    internalBinaryWrite(message: base_message, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message base_message
 */
export declare const base_message: base_message$Type;
declare class peerConnectionOptions$Type extends MessageType<peerConnectionOptions> {
    constructor();
    create(value?: PartialMessage<peerConnectionOptions>): peerConnectionOptions;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: peerConnectionOptions): peerConnectionOptions;
    internalBinaryWrite(message: peerConnectionOptions, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message peerConnectionOptions
 */
export declare const peerConnectionOptions: peerConnectionOptions$Type;
declare class config$Type extends MessageType<config> {
    constructor();
    create(value?: PartialMessage<config>): config;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: config): config;
    internalBinaryWrite(message: config, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message config
 */
export declare const config: config$Type;
declare class identify$Type extends MessageType<identify> {
    constructor();
    create(value?: PartialMessage<identify>): identify;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: identify): identify;
    internalBinaryWrite(message: identify, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message identify
 */
export declare const identify: identify$Type;
declare class endpointId$Type extends MessageType<endpointId> {
    constructor();
    create(value?: PartialMessage<endpointId>): endpointId;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: endpointId): endpointId;
    internalBinaryWrite(message: endpointId, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message endpointId
 */
export declare const endpointId: endpointId$Type;
declare class endpointIdConfirm$Type extends MessageType<endpointIdConfirm> {
    constructor();
    create(value?: PartialMessage<endpointIdConfirm>): endpointIdConfirm;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: endpointIdConfirm): endpointIdConfirm;
    internalBinaryWrite(message: endpointIdConfirm, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message endpointIdConfirm
 */
export declare const endpointIdConfirm: endpointIdConfirm$Type;
declare class streamerIdChanged$Type extends MessageType<streamerIdChanged> {
    constructor();
    create(value?: PartialMessage<streamerIdChanged>): streamerIdChanged;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: streamerIdChanged): streamerIdChanged;
    internalBinaryWrite(message: streamerIdChanged, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message streamerIdChanged
 */
export declare const streamerIdChanged: streamerIdChanged$Type;
declare class listStreamers$Type extends MessageType<listStreamers> {
    constructor();
    create(value?: PartialMessage<listStreamers>): listStreamers;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: listStreamers): listStreamers;
    internalBinaryWrite(message: listStreamers, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message listStreamers
 */
export declare const listStreamers: listStreamers$Type;
declare class streamerList$Type extends MessageType<streamerList> {
    constructor();
    create(value?: PartialMessage<streamerList>): streamerList;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: streamerList): streamerList;
    internalBinaryWrite(message: streamerList, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message streamerList
 */
export declare const streamerList: streamerList$Type;
declare class subscribe$Type extends MessageType<subscribe> {
    constructor();
    create(value?: PartialMessage<subscribe>): subscribe;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: subscribe): subscribe;
    internalBinaryWrite(message: subscribe, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message subscribe
 */
export declare const subscribe: subscribe$Type;
declare class unsubscribe$Type extends MessageType<unsubscribe> {
    constructor();
    create(value?: PartialMessage<unsubscribe>): unsubscribe;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: unsubscribe): unsubscribe;
    internalBinaryWrite(message: unsubscribe, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message unsubscribe
 */
export declare const unsubscribe: unsubscribe$Type;
declare class subscribeFailed$Type extends MessageType<subscribeFailed> {
    constructor();
    create(value?: PartialMessage<subscribeFailed>): subscribeFailed;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: subscribeFailed): subscribeFailed;
    internalBinaryWrite(message: subscribeFailed, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message subscribeFailed
 */
export declare const subscribeFailed: subscribeFailed$Type;
declare class playerConnected$Type extends MessageType<playerConnected> {
    constructor();
    create(value?: PartialMessage<playerConnected>): playerConnected;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: playerConnected): playerConnected;
    internalBinaryWrite(message: playerConnected, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message playerConnected
 */
export declare const playerConnected: playerConnected$Type;
declare class playerDisconnected$Type extends MessageType<playerDisconnected> {
    constructor();
    create(value?: PartialMessage<playerDisconnected>): playerDisconnected;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: playerDisconnected): playerDisconnected;
    internalBinaryWrite(message: playerDisconnected, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message playerDisconnected
 */
export declare const playerDisconnected: playerDisconnected$Type;
declare class offer$Type extends MessageType<offer> {
    constructor();
    create(value?: PartialMessage<offer>): offer;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: offer): offer;
    internalBinaryWrite(message: offer, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message offer
 */
export declare const offer: offer$Type;
declare class answer$Type extends MessageType<answer> {
    constructor();
    create(value?: PartialMessage<answer>): answer;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: answer): answer;
    internalBinaryWrite(message: answer, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message answer
 */
export declare const answer: answer$Type;
declare class iceCandidateData$Type extends MessageType<iceCandidateData> {
    constructor();
    create(value?: PartialMessage<iceCandidateData>): iceCandidateData;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: iceCandidateData): iceCandidateData;
    internalBinaryWrite(message: iceCandidateData, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message iceCandidateData
 */
export declare const iceCandidateData: iceCandidateData$Type;
declare class iceCandidate$Type extends MessageType<iceCandidate> {
    constructor();
    create(value?: PartialMessage<iceCandidate>): iceCandidate;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: iceCandidate): iceCandidate;
    internalBinaryWrite(message: iceCandidate, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message iceCandidate
 */
export declare const iceCandidate: iceCandidate$Type;
declare class disconnectPlayer$Type extends MessageType<disconnectPlayer> {
    constructor();
    create(value?: PartialMessage<disconnectPlayer>): disconnectPlayer;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: disconnectPlayer): disconnectPlayer;
    internalBinaryWrite(message: disconnectPlayer, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message disconnectPlayer
 */
export declare const disconnectPlayer: disconnectPlayer$Type;
declare class ping$Type extends MessageType<ping> {
    constructor();
    create(value?: PartialMessage<ping>): ping;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: ping): ping;
    internalBinaryWrite(message: ping, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message ping
 */
export declare const ping: ping$Type;
declare class pong$Type extends MessageType<pong> {
    constructor();
    create(value?: PartialMessage<pong>): pong;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: pong): pong;
    internalBinaryWrite(message: pong, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message pong
 */
export declare const pong: pong$Type;
declare class streamerDisconnected$Type extends MessageType<streamerDisconnected> {
    constructor();
    create(value?: PartialMessage<streamerDisconnected>): streamerDisconnected;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: streamerDisconnected): streamerDisconnected;
    internalBinaryWrite(message: streamerDisconnected, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message streamerDisconnected
 */
export declare const streamerDisconnected: streamerDisconnected$Type;
declare class layerPreference$Type extends MessageType<layerPreference> {
    constructor();
    create(value?: PartialMessage<layerPreference>): layerPreference;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: layerPreference): layerPreference;
    internalBinaryWrite(message: layerPreference, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message layerPreference
 */
export declare const layerPreference: layerPreference$Type;
declare class dataChannelRequest$Type extends MessageType<dataChannelRequest> {
    constructor();
    create(value?: PartialMessage<dataChannelRequest>): dataChannelRequest;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: dataChannelRequest): dataChannelRequest;
    internalBinaryWrite(message: dataChannelRequest, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message dataChannelRequest
 */
export declare const dataChannelRequest: dataChannelRequest$Type;
declare class peerDataChannels$Type extends MessageType<peerDataChannels> {
    constructor();
    create(value?: PartialMessage<peerDataChannels>): peerDataChannels;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: peerDataChannels): peerDataChannels;
    internalBinaryWrite(message: peerDataChannels, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message peerDataChannels
 */
export declare const peerDataChannels: peerDataChannels$Type;
declare class peerDataChannelsReady$Type extends MessageType<peerDataChannelsReady> {
    constructor();
    create(value?: PartialMessage<peerDataChannelsReady>): peerDataChannelsReady;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: peerDataChannelsReady): peerDataChannelsReady;
    internalBinaryWrite(message: peerDataChannelsReady, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message peerDataChannelsReady
 */
export declare const peerDataChannelsReady: peerDataChannelsReady$Type;
declare class streamerDataChannels$Type extends MessageType<streamerDataChannels> {
    constructor();
    create(value?: PartialMessage<streamerDataChannels>): streamerDataChannels;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: streamerDataChannels): streamerDataChannels;
    internalBinaryWrite(message: streamerDataChannels, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message streamerDataChannels
 */
export declare const streamerDataChannels: streamerDataChannels$Type;
declare class startStreaming$Type extends MessageType<startStreaming> {
    constructor();
    create(value?: PartialMessage<startStreaming>): startStreaming;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: startStreaming): startStreaming;
    internalBinaryWrite(message: startStreaming, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message startStreaming
 */
export declare const startStreaming: startStreaming$Type;
declare class stopStreaming$Type extends MessageType<stopStreaming> {
    constructor();
    create(value?: PartialMessage<stopStreaming>): stopStreaming;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: stopStreaming): stopStreaming;
    internalBinaryWrite(message: stopStreaming, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message stopStreaming
 */
export declare const stopStreaming: stopStreaming$Type;
declare class playerCount$Type extends MessageType<playerCount> {
    constructor();
    create(value?: PartialMessage<playerCount>): playerCount;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: playerCount): playerCount;
    internalBinaryWrite(message: playerCount, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message playerCount
 */
export declare const playerCount: playerCount$Type;
declare class stats$Type extends MessageType<stats> {
    constructor();
    create(value?: PartialMessage<stats>): stats;
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: stats): stats;
    internalBinaryWrite(message: stats, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter;
}
/**
 * @generated MessageType for protobuf message stats
 */
export declare const stats: stats$Type;
export {};
