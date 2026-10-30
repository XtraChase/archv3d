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
export declare class EventEmitter extends EventTarget {
    private _eventListeners;
    constructor();
    private removeListenerInternal;
    /**
     * Alias for `emitter.on(eventName, listener)`.
     */
    addListener(eventName: string, listener: (...args: any[]) => void): this;
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
    on(eventName: string, listener: (...args: any[]) => void): this;
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
    once(eventName: string, listener: (...args: any[]) => void): this;
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
    removeListener(eventName: string, listener: (...args: any[]) => void): this;
    /**
     * Alias for `emitter.removeListener()`.
     */
    off(eventName: string, listener: (...args: any[]) => void): this;
    /**
     * Removes all listeners, or those of the specified `eventName`.
     * Returns a reference to the `EventEmitter`, so that calls can be chained.
     */
    removeAllListeners(eventName: string): this;
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
    emit(eventName: string, ...args: any[]): boolean;
}
