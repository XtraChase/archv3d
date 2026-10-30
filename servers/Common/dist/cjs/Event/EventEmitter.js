"use strict";
// Copyright Epic Games, Inc. All Rights Reserved.
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = void 0;
// To match NodeJS' EventEmitter syntax without downstream code changes we need to use `any`.
// This means we need to disable linting `any` checks on this file.
//
/* eslint-disable @typescript-eslint/no-unsafe-argument */
class PixelStreamingEventListener {
    constructor(callback) {
        this._args = [];
        this._callback = callback;
    }
    handleEvent(_evt) {
        this._callback(...this._args);
        // Reset storage of args.
        this._args = [];
    }
    setArgs(...args) {
        this._args = args;
    }
}
/**
 * A feature-limited, but _mostly_ drop-in replacement for Node's EventEmitter type that is implemented using EventTarget.
 *
 * For those unfamiliar with Node's EventEmitter, here is some info from the official docs:
 *
 * [In NodeJS] all objects that emit events are instances of the `EventEmitter` class. These
 * objects expose an `eventEmitter.on()` function that allows one or more
 * functions to be attached to named events emitted by the object. Typically,
 * event names are camel-cased strings but any valid JavaScript property key
 * can be used.
 *
 * When the `EventEmitter` object emits an event, all of the functions attached
 * to that specific event are called _synchronously_. Any values returned by the
 * called listeners are _ignored_ and discarded.
 *
 * The following example shows a simple `EventEmitter` instance with a single
 * listener. The `eventEmitter.on()` method is used to register listeners, while
 * the `eventEmitter.emit()` method is used to trigger the event.
 *
 * ```js
 * import { EventEmitter } from 'node:events';
 *
 * class MyEmitter extends EventEmitter {}
 *
 * const myEmitter = new MyEmitter();
 * myEmitter.on('event', () => {
 *   console.log('an event occurred!');
 * });
 * myEmitter.emit('event');
 * ```
 */
class EventEmitter extends EventTarget {
    constructor() {
        super();
        this._eventListeners = new Map();
    }
    removeListenerInternal(eventName, listener) {
        if (this._eventListeners.has(eventName)) {
            const listeners = this._eventListeners.get(eventName);
            if (listeners === undefined) {
                return this;
            }
            for (let i = 0; i < listeners.length; ++i) {
                const eventPair = listeners[i];
                if (eventPair.callback === listener) {
                    // Remove from event target
                    super.removeEventListener(eventName, eventPair.eventListenerWrapper);
                    // Remove from our internal map
                    listeners.splice(i, 1);
                    break;
                }
            }
        }
        return this;
    }
    /**
     * Alias for `emitter.on(eventName, listener)`.
     */
    addListener(eventName, listener) {
        return this.on(eventName, listener);
    }
    /**
     * Adds the `listener` function to the end of the listeners array for the event
     * named `eventName`.
     *
     * ```js
     * server.on('connection', (stream) => {
     *   console.log('someone connected!');
     * });
     * ```
     *
     * Returns a reference to the `EventEmitter`, so that calls can be chained.
     *
     * @param eventName - The name of the event.
     * @param listener - The callback function
     */
    on(eventName, listener) {
        var _a;
        // Wrap our normal JS function in a event listener interface
        // so we can use it with event target.
        const eventListenerWrapper = new PixelStreamingEventListener(listener);
        super.addEventListener(eventName, eventListenerWrapper);
        // Store the event listener/function pair for later removal.
        if (!this._eventListeners.has(eventName)) {
            this._eventListeners.set(eventName, new Array());
        }
        (_a = this._eventListeners
            .get(eventName)) === null || _a === void 0 ? void 0 : _a.push({ callback: listener, eventListenerWrapper: eventListenerWrapper });
        return this;
    }
    /**
     * Adds a **one-time** `listener` function for the event named `eventName`. The
     * next time `eventName` is triggered, this listener is removed and then invoked.
     *
     * ```js
     * server.once('connection', (stream) => {
     *   console.log('Ah, we have our first user!');
     * });
     * ```
     *
     * Returns a reference to the `EventEmitter`, so that calls can be chained.
     * @param eventName - The name of the event.
     * @param listener - The callback function
     */
    once(eventName, listener) {
        var _a;
        // Pass options so this event callback is only called once
        const eventListenerOpts = { once: true };
        // Wrap our normal JS function in a event listener interface
        // so we can use it with event target and remove it from event target when this function completes.
        const eventListenerWrapper = new PixelStreamingEventListener((...args) => {
            listener(args);
            this.removeListenerInternal(eventName, listener);
        });
        super.addEventListener(eventName, eventListenerWrapper, eventListenerOpts);
        // Store the event listener/function pair for later removal.
        if (!this._eventListeners.has(eventName)) {
            this._eventListeners.set(eventName, new Array());
        }
        (_a = this._eventListeners
            .get(eventName)) === null || _a === void 0 ? void 0 : _a.push({ callback: listener, eventListenerWrapper: eventListenerWrapper });
        return this;
    }
    /**
     * Removes the specified `listener` from this EventEmitter.
     *
     * ```js
     * const callback = (stream) => {
     *   console.log('someone connected!');
     * };
     * server.on('connection', callback);
     * // ...
     * server.removeListener('connection', callback);
     * ```
     * Returns a reference to the `EventEmitter`, so that calls can be chained.
     */
    removeListener(eventName, listener) {
        this.removeListenerInternal(eventName, listener);
        return this;
    }
    /**
     * Alias for `emitter.removeListener()`.
     */
    off(eventName, listener) {
        return this.removeListener(eventName, listener);
    }
    /**
     * Removes all listeners, or those of the specified `eventName`.
     * Returns a reference to the `EventEmitter`, so that calls can be chained.
     */
    removeAllListeners(eventName) {
        if (this._eventListeners.has(eventName)) {
            const listeners = this._eventListeners.get(eventName);
            if (listeners === undefined) {
                return this;
            }
            // Remove each event listener from the event target
            for (const listenerPair of listeners) {
                this.removeEventListener(eventName, listenerPair.eventListenerWrapper);
            }
            // Remove all event listeners mapped to this event from our internal map
            this._eventListeners.delete(eventName);
        }
        return this;
    }
    /**
     * Synchronously calls each of the listeners registered for the event named `eventName`, in the order they were registered, passing the supplied arguments
     * to each.
     *
     * Returns `true` if the event had listeners, `false` otherwise.
     *
     * ```js
     * import { EventEmitter } from 'node:events';
     * const myEmitter = new EventEmitter();
     *
     * // First listener
     * myEmitter.on('event', function firstListener() {
     *   console.log('Helloooo! first listener');
     * });
     * // Second listener
     * myEmitter.on('event', function secondListener(arg1, arg2) {
     *   console.log(`event with parameters ${arg1}, ${arg2} in second listener`);
     * });
     * // Third listener
     * myEmitter.on('event', function thirdListener(...args) {
     *   const parameters = args.join(', ');
     *   console.log(`event with parameters ${parameters} in third listener`);
     * });
     *
     * console.log(myEmitter.listeners('event'));
     *
     * myEmitter.emit('event', 1, 2, 3, 4, 5);
     *
     * // Prints:
     * // [
     * //   [Function: firstListener],
     * //   [Function: secondListener],
     * //   [Function: thirdListener]
     * // ]
     * // Helloooo! first listener
     * // event with parameters 1, 2 in second listener
     * // event with parameters 1, 2, 3, 4, 5 in third listener
     * ```
     */
    emit(eventName, ...args) {
        if (this._eventListeners.has(eventName)) {
            const listeners = this._eventListeners.get(eventName);
            if (listeners === undefined) {
                return false;
            }
            // Ensure each of our listeners have the args the callback injected
            for (const listenerPair of listeners) {
                listenerPair.eventListenerWrapper.setArgs(...args);
            }
            // Fire off the actual event
            super.dispatchEvent(new Event(eventName));
            return true;
        }
        return false;
    }
}
exports.EventEmitter = EventEmitter;
//# sourceMappingURL=EventEmitter.js.map