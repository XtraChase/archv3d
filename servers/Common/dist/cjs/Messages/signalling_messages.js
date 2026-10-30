"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stats = exports.playerCount = exports.stopStreaming = exports.startStreaming = exports.streamerDataChannels = exports.peerDataChannelsReady = exports.peerDataChannels = exports.dataChannelRequest = exports.layerPreference = exports.streamerDisconnected = exports.pong = exports.ping = exports.disconnectPlayer = exports.iceCandidate = exports.iceCandidateData = exports.answer = exports.offer = exports.playerDisconnected = exports.playerConnected = exports.subscribeFailed = exports.unsubscribe = exports.subscribe = exports.streamerList = exports.listStreamers = exports.streamerIdChanged = exports.endpointIdConfirm = exports.endpointId = exports.identify = exports.config = exports.peerConnectionOptions = exports.base_message = void 0;
const runtime_1 = require("@protobuf-ts/runtime");
const runtime_2 = require("@protobuf-ts/runtime");
const runtime_3 = require("@protobuf-ts/runtime");
const runtime_4 = require("@protobuf-ts/runtime");
// @generated message type with reflection information, may provide speed optimized methods
class base_message$Type extends runtime_4.MessageType {
    constructor() {
        super("base_message", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message base_message
 */
exports.base_message = new base_message$Type();
// @generated message type with reflection information, may provide speed optimized methods
class peerConnectionOptions$Type extends runtime_4.MessageType {
    constructor() {
        super("peerConnectionOptions", []);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message peerConnectionOptions
 */
exports.peerConnectionOptions = new peerConnectionOptions$Type();
// @generated message type with reflection information, may provide speed optimized methods
class config$Type extends runtime_4.MessageType {
    constructor() {
        super("config", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "peerConnectionOptions", kind: "message", T: () => exports.peerConnectionOptions },
            { no: 3, name: "protocolVersion", kind: "scalar", opt: true, T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* peerConnectionOptions peerConnectionOptions */ 2:
                    message.peerConnectionOptions = exports.peerConnectionOptions.internalBinaryRead(reader, reader.uint32(), options, message.peerConnectionOptions);
                    break;
                case /* optional string protocolVersion */ 3:
                    message.protocolVersion = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* peerConnectionOptions peerConnectionOptions = 2; */
        if (message.peerConnectionOptions)
            exports.peerConnectionOptions.internalBinaryWrite(message.peerConnectionOptions, writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* optional string protocolVersion = 3; */
        if (message.protocolVersion !== undefined)
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.protocolVersion);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message config
 */
exports.config = new config$Type();
// @generated message type with reflection information, may provide speed optimized methods
class identify$Type extends runtime_4.MessageType {
    constructor() {
        super("identify", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message identify
 */
exports.identify = new identify$Type();
// @generated message type with reflection information, may provide speed optimized methods
class endpointId$Type extends runtime_4.MessageType {
    constructor() {
        super("endpointId", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "id", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "protocolVersion", kind: "scalar", opt: true, T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.id = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* string id */ 2:
                    message.id = reader.string();
                    break;
                case /* optional string protocolVersion */ 3:
                    message.protocolVersion = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* string id = 2; */
        if (message.id !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.id);
        /* optional string protocolVersion = 3; */
        if (message.protocolVersion !== undefined)
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.protocolVersion);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message endpointId
 */
exports.endpointId = new endpointId$Type();
// @generated message type with reflection information, may provide speed optimized methods
class endpointIdConfirm$Type extends runtime_4.MessageType {
    constructor() {
        super("endpointIdConfirm", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "committedId", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.committedId = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* string committedId */ 2:
                    message.committedId = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* string committedId = 2; */
        if (message.committedId !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.committedId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message endpointIdConfirm
 */
exports.endpointIdConfirm = new endpointIdConfirm$Type();
// @generated message type with reflection information, may provide speed optimized methods
class streamerIdChanged$Type extends runtime_4.MessageType {
    constructor() {
        super("streamerIdChanged", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "newID", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.newID = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* string newID */ 2:
                    message.newID = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* string newID = 2; */
        if (message.newID !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.newID);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message streamerIdChanged
 */
exports.streamerIdChanged = new streamerIdChanged$Type();
// @generated message type with reflection information, may provide speed optimized methods
class listStreamers$Type extends runtime_4.MessageType {
    constructor() {
        super("listStreamers", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message listStreamers
 */
exports.listStreamers = new listStreamers$Type();
// @generated message type with reflection information, may provide speed optimized methods
class streamerList$Type extends runtime_4.MessageType {
    constructor() {
        super("streamerList", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "ids", kind: "scalar", repeat: 2 /*RepeatType.UNPACKED*/, T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.ids = [];
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* repeated string ids */ 2:
                    message.ids.push(reader.string());
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* repeated string ids = 2; */
        for (let i = 0; i < message.ids.length; i++)
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.ids[i]);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message streamerList
 */
exports.streamerList = new streamerList$Type();
// @generated message type with reflection information, may provide speed optimized methods
class subscribe$Type extends runtime_4.MessageType {
    constructor() {
        super("subscribe", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "streamerId", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.streamerId = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* string streamerId */ 2:
                    message.streamerId = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* string streamerId = 2; */
        if (message.streamerId !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.streamerId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message subscribe
 */
exports.subscribe = new subscribe$Type();
// @generated message type with reflection information, may provide speed optimized methods
class unsubscribe$Type extends runtime_4.MessageType {
    constructor() {
        super("unsubscribe", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message unsubscribe
 */
exports.unsubscribe = new unsubscribe$Type();
// @generated message type with reflection information, may provide speed optimized methods
class subscribeFailed$Type extends runtime_4.MessageType {
    constructor() {
        super("subscribeFailed", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "message", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.message = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* string message */ 2:
                    message.message = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* string message = 2; */
        if (message.message !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.message);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message subscribeFailed
 */
exports.subscribeFailed = new subscribeFailed$Type();
// @generated message type with reflection information, may provide speed optimized methods
class playerConnected$Type extends runtime_4.MessageType {
    constructor() {
        super("playerConnected", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "dataChannel", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 3, name: "sfu", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 5, name: "playerId", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.dataChannel = false;
        message.sfu = false;
        message.playerId = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* bool dataChannel */ 2:
                    message.dataChannel = reader.bool();
                    break;
                case /* bool sfu */ 3:
                    message.sfu = reader.bool();
                    break;
                case /* string playerId */ 5:
                    message.playerId = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* bool dataChannel = 2; */
        if (message.dataChannel !== false)
            writer.tag(2, runtime_1.WireType.Varint).bool(message.dataChannel);
        /* bool sfu = 3; */
        if (message.sfu !== false)
            writer.tag(3, runtime_1.WireType.Varint).bool(message.sfu);
        /* string playerId = 5; */
        if (message.playerId !== "")
            writer.tag(5, runtime_1.WireType.LengthDelimited).string(message.playerId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message playerConnected
 */
exports.playerConnected = new playerConnected$Type();
// @generated message type with reflection information, may provide speed optimized methods
class playerDisconnected$Type extends runtime_4.MessageType {
    constructor() {
        super("playerDisconnected", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "playerId", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.playerId = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* string playerId */ 2:
                    message.playerId = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* string playerId = 2; */
        if (message.playerId !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.playerId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message playerDisconnected
 */
exports.playerDisconnected = new playerDisconnected$Type();
// @generated message type with reflection information, may provide speed optimized methods
class offer$Type extends runtime_4.MessageType {
    constructor() {
        super("offer", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "sdp", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "playerId", kind: "scalar", opt: true, T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "sfu", kind: "scalar", opt: true, T: 8 /*ScalarType.BOOL*/ },
            { no: 5, name: "multiplex", kind: "scalar", opt: true, T: 8 /*ScalarType.BOOL*/ },
            { no: 6, name: "scalabilityMode", kind: "scalar", opt: true, T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.sdp = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* string sdp */ 2:
                    message.sdp = reader.string();
                    break;
                case /* optional string playerId */ 3:
                    message.playerId = reader.string();
                    break;
                case /* optional bool sfu */ 4:
                    message.sfu = reader.bool();
                    break;
                case /* optional bool multiplex */ 5:
                    message.multiplex = reader.bool();
                    break;
                case /* optional string scalabilityMode */ 6:
                    message.scalabilityMode = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* string sdp = 2; */
        if (message.sdp !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.sdp);
        /* optional string playerId = 3; */
        if (message.playerId !== undefined)
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.playerId);
        /* optional bool sfu = 4; */
        if (message.sfu !== undefined)
            writer.tag(4, runtime_1.WireType.Varint).bool(message.sfu);
        /* optional bool multiplex = 5; */
        if (message.multiplex !== undefined)
            writer.tag(5, runtime_1.WireType.Varint).bool(message.multiplex);
        /* optional string scalabilityMode = 6; */
        if (message.scalabilityMode !== undefined)
            writer.tag(6, runtime_1.WireType.LengthDelimited).string(message.scalabilityMode);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message offer
 */
exports.offer = new offer$Type();
// @generated message type with reflection information, may provide speed optimized methods
class answer$Type extends runtime_4.MessageType {
    constructor() {
        super("answer", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "sdp", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "playerId", kind: "scalar", opt: true, T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "minBitrateBps", kind: "scalar", opt: true, T: 5 /*ScalarType.INT32*/ },
            { no: 5, name: "maxBitrateBps", kind: "scalar", opt: true, T: 5 /*ScalarType.INT32*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.sdp = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* string sdp */ 2:
                    message.sdp = reader.string();
                    break;
                case /* optional string playerId */ 3:
                    message.playerId = reader.string();
                    break;
                case /* optional int32 minBitrateBps */ 4:
                    message.minBitrateBps = reader.int32();
                    break;
                case /* optional int32 maxBitrateBps */ 5:
                    message.maxBitrateBps = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* string sdp = 2; */
        if (message.sdp !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.sdp);
        /* optional string playerId = 3; */
        if (message.playerId !== undefined)
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.playerId);
        /* optional int32 minBitrateBps = 4; */
        if (message.minBitrateBps !== undefined)
            writer.tag(4, runtime_1.WireType.Varint).int32(message.minBitrateBps);
        /* optional int32 maxBitrateBps = 5; */
        if (message.maxBitrateBps !== undefined)
            writer.tag(5, runtime_1.WireType.Varint).int32(message.maxBitrateBps);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message answer
 */
exports.answer = new answer$Type();
// @generated message type with reflection information, may provide speed optimized methods
class iceCandidateData$Type extends runtime_4.MessageType {
    constructor() {
        super("iceCandidateData", [
            { no: 1, name: "candidate", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "sdpMid", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "sdpMLineIndex", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 4, name: "usernameFragment", kind: "scalar", opt: true, T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.candidate = "";
        message.sdpMid = "";
        message.sdpMLineIndex = 0;
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string candidate */ 1:
                    message.candidate = reader.string();
                    break;
                case /* string sdpMid */ 2:
                    message.sdpMid = reader.string();
                    break;
                case /* int32 sdpMLineIndex */ 3:
                    message.sdpMLineIndex = reader.int32();
                    break;
                case /* optional string usernameFragment */ 4:
                    message.usernameFragment = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string candidate = 1; */
        if (message.candidate !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.candidate);
        /* string sdpMid = 2; */
        if (message.sdpMid !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.sdpMid);
        /* int32 sdpMLineIndex = 3; */
        if (message.sdpMLineIndex !== 0)
            writer.tag(3, runtime_1.WireType.Varint).int32(message.sdpMLineIndex);
        /* optional string usernameFragment = 4; */
        if (message.usernameFragment !== undefined)
            writer.tag(4, runtime_1.WireType.LengthDelimited).string(message.usernameFragment);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message iceCandidateData
 */
exports.iceCandidateData = new iceCandidateData$Type();
// @generated message type with reflection information, may provide speed optimized methods
class iceCandidate$Type extends runtime_4.MessageType {
    constructor() {
        super("iceCandidate", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "candidate", kind: "message", T: () => exports.iceCandidateData },
            { no: 3, name: "playerId", kind: "scalar", opt: true, T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* iceCandidateData candidate */ 2:
                    message.candidate = exports.iceCandidateData.internalBinaryRead(reader, reader.uint32(), options, message.candidate);
                    break;
                case /* optional string playerId */ 3:
                    message.playerId = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* iceCandidateData candidate = 2; */
        if (message.candidate)
            exports.iceCandidateData.internalBinaryWrite(message.candidate, writer.tag(2, runtime_1.WireType.LengthDelimited).fork(), options).join();
        /* optional string playerId = 3; */
        if (message.playerId !== undefined)
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.playerId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message iceCandidate
 */
exports.iceCandidate = new iceCandidate$Type();
// @generated message type with reflection information, may provide speed optimized methods
class disconnectPlayer$Type extends runtime_4.MessageType {
    constructor() {
        super("disconnectPlayer", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "playerId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "reason", kind: "scalar", opt: true, T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.playerId = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* string playerId */ 2:
                    message.playerId = reader.string();
                    break;
                case /* optional string reason */ 3:
                    message.reason = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* string playerId = 2; */
        if (message.playerId !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.playerId);
        /* optional string reason = 3; */
        if (message.reason !== undefined)
            writer.tag(3, runtime_1.WireType.LengthDelimited).string(message.reason);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message disconnectPlayer
 */
exports.disconnectPlayer = new disconnectPlayer$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ping$Type extends runtime_4.MessageType {
    constructor() {
        super("ping", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "time", kind: "scalar", T: 5 /*ScalarType.INT32*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.time = 0;
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* int32 time */ 2:
                    message.time = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* int32 time = 2; */
        if (message.time !== 0)
            writer.tag(2, runtime_1.WireType.Varint).int32(message.time);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message ping
 */
exports.ping = new ping$Type();
// @generated message type with reflection information, may provide speed optimized methods
class pong$Type extends runtime_4.MessageType {
    constructor() {
        super("pong", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "time", kind: "scalar", T: 5 /*ScalarType.INT32*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.time = 0;
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* int32 time */ 2:
                    message.time = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* int32 time = 2; */
        if (message.time !== 0)
            writer.tag(2, runtime_1.WireType.Varint).int32(message.time);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message pong
 */
exports.pong = new pong$Type();
// @generated message type with reflection information, may provide speed optimized methods
class streamerDisconnected$Type extends runtime_4.MessageType {
    constructor() {
        super("streamerDisconnected", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message streamerDisconnected
 */
exports.streamerDisconnected = new streamerDisconnected$Type();
// @generated message type with reflection information, may provide speed optimized methods
class layerPreference$Type extends runtime_4.MessageType {
    constructor() {
        super("layerPreference", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "spatialLayer", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 3, name: "temporalLayer", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 4, name: "playerId", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.spatialLayer = 0;
        message.temporalLayer = 0;
        message.playerId = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* int32 spatialLayer */ 2:
                    message.spatialLayer = reader.int32();
                    break;
                case /* int32 temporalLayer */ 3:
                    message.temporalLayer = reader.int32();
                    break;
                case /* string playerId */ 4:
                    message.playerId = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* int32 spatialLayer = 2; */
        if (message.spatialLayer !== 0)
            writer.tag(2, runtime_1.WireType.Varint).int32(message.spatialLayer);
        /* int32 temporalLayer = 3; */
        if (message.temporalLayer !== 0)
            writer.tag(3, runtime_1.WireType.Varint).int32(message.temporalLayer);
        /* string playerId = 4; */
        if (message.playerId !== "")
            writer.tag(4, runtime_1.WireType.LengthDelimited).string(message.playerId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message layerPreference
 */
exports.layerPreference = new layerPreference$Type();
// @generated message type with reflection information, may provide speed optimized methods
class dataChannelRequest$Type extends runtime_4.MessageType {
    constructor() {
        super("dataChannelRequest", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message dataChannelRequest
 */
exports.dataChannelRequest = new dataChannelRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class peerDataChannels$Type extends runtime_4.MessageType {
    constructor() {
        super("peerDataChannels", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "playerId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "sendStreamId", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 4, name: "recvStreamId", kind: "scalar", T: 5 /*ScalarType.INT32*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.playerId = "";
        message.sendStreamId = 0;
        message.recvStreamId = 0;
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* string playerId */ 2:
                    message.playerId = reader.string();
                    break;
                case /* int32 sendStreamId */ 3:
                    message.sendStreamId = reader.int32();
                    break;
                case /* int32 recvStreamId */ 4:
                    message.recvStreamId = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* string playerId = 2; */
        if (message.playerId !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.playerId);
        /* int32 sendStreamId = 3; */
        if (message.sendStreamId !== 0)
            writer.tag(3, runtime_1.WireType.Varint).int32(message.sendStreamId);
        /* int32 recvStreamId = 4; */
        if (message.recvStreamId !== 0)
            writer.tag(4, runtime_1.WireType.Varint).int32(message.recvStreamId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message peerDataChannels
 */
exports.peerDataChannels = new peerDataChannels$Type();
// @generated message type with reflection information, may provide speed optimized methods
class peerDataChannelsReady$Type extends runtime_4.MessageType {
    constructor() {
        super("peerDataChannelsReady", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message peerDataChannelsReady
 */
exports.peerDataChannelsReady = new peerDataChannelsReady$Type();
// @generated message type with reflection information, may provide speed optimized methods
class streamerDataChannels$Type extends runtime_4.MessageType {
    constructor() {
        super("streamerDataChannels", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "sfuId", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "sendStreamId", kind: "scalar", T: 5 /*ScalarType.INT32*/ },
            { no: 4, name: "recvStreamId", kind: "scalar", T: 5 /*ScalarType.INT32*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.sfuId = "";
        message.sendStreamId = 0;
        message.recvStreamId = 0;
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* string sfuId */ 2:
                    message.sfuId = reader.string();
                    break;
                case /* int32 sendStreamId */ 3:
                    message.sendStreamId = reader.int32();
                    break;
                case /* int32 recvStreamId */ 4:
                    message.recvStreamId = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* string sfuId = 2; */
        if (message.sfuId !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.sfuId);
        /* int32 sendStreamId = 3; */
        if (message.sendStreamId !== 0)
            writer.tag(3, runtime_1.WireType.Varint).int32(message.sendStreamId);
        /* int32 recvStreamId = 4; */
        if (message.recvStreamId !== 0)
            writer.tag(4, runtime_1.WireType.Varint).int32(message.recvStreamId);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message streamerDataChannels
 */
exports.streamerDataChannels = new streamerDataChannels$Type();
// @generated message type with reflection information, may provide speed optimized methods
class startStreaming$Type extends runtime_4.MessageType {
    constructor() {
        super("startStreaming", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message startStreaming
 */
exports.startStreaming = new startStreaming$Type();
// @generated message type with reflection information, may provide speed optimized methods
class stopStreaming$Type extends runtime_4.MessageType {
    constructor() {
        super("stopStreaming", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message stopStreaming
 */
exports.stopStreaming = new stopStreaming$Type();
// @generated message type with reflection information, may provide speed optimized methods
class playerCount$Type extends runtime_4.MessageType {
    constructor() {
        super("playerCount", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "count", kind: "scalar", T: 5 /*ScalarType.INT32*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.count = 0;
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* int32 count */ 2:
                    message.count = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* int32 count = 2; */
        if (message.count !== 0)
            writer.tag(2, runtime_1.WireType.Varint).int32(message.count);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message playerCount
 */
exports.playerCount = new playerCount$Type();
// @generated message type with reflection information, may provide speed optimized methods
class stats$Type extends runtime_4.MessageType {
    constructor() {
        super("stats", [
            { no: 1, name: "type", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "data", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value) {
        const message = globalThis.Object.create((this.messagePrototype));
        message.type = "";
        message.data = "";
        if (value !== undefined)
            (0, runtime_3.reflectionMergePartial)(this, message, value);
        return message;
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string type */ 1:
                    message.type = reader.string();
                    break;
                case /* string data */ 2:
                    message.data = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? runtime_2.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message, writer, options) {
        /* string type = 1; */
        if (message.type !== "")
            writer.tag(1, runtime_1.WireType.LengthDelimited).string(message.type);
        /* string data = 2; */
        if (message.data !== "")
            writer.tag(2, runtime_1.WireType.LengthDelimited).string(message.data);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? runtime_2.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message stats
 */
exports.stats = new stats$Type();
//# sourceMappingURL=signalling_messages.js.map