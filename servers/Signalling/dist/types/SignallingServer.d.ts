import http from 'http';
import https from 'https';
import * as wslib from 'ws';
import { StreamerRegistry } from './StreamerRegistry';
import { PlayerRegistry } from './PlayerRegistry';
/**
 * An interface describing the possible options to pass when creating
 * a new SignallingServer object.
 */
export interface IServerConfig {
    httpServer?: http.Server;
    httpsServer?: https.Server;
    streamerPort: number;
    playerPort?: number;
    sfuPort?: number;
    peerOptions: unknown;
    streamerWsOptions?: wslib.ServerOptions;
    playerWsOptions?: wslib.ServerOptions;
    sfuWsOptions?: wslib.ServerOptions;
    maxSubscribers?: number;
}
export type ProtocolConfig = {
    [key: string]: any;
};
/**
 * The main signalling server object.
 * Contains a streamer and player registry and handles setting up of websockets
 * to listen for incoming connections.
 */
export declare class SignallingServer {
    config: IServerConfig;
    protocolConfig: ProtocolConfig;
    streamerRegistry: StreamerRegistry;
    playerRegistry: PlayerRegistry;
    startTime: Date;
    /**
     * Initializes the server object and sets up listening sockets for streamers
     * players and optionally SFU connections.
     * @param config - A collection of options for this server.
     */
    constructor(config: IServerConfig);
    private onStreamerConnected;
    private onPlayerConnected;
    private onSFUConnected;
}
