"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
/* eslint-disable @typescript-eslint/no-unsafe-argument,
                  @typescript-eslint/no-unsafe-call,
                  @typescript-eslint/no-unsafe-member-access */
function default_1(signallingServer) {
    const operations = {
        GET
    };
    function GET(req, res, _next) {
        const streamer = signallingServer.streamerRegistry.find(req.params.streamerId);
        if (!streamer) {
            throw new Error(`No streamer id matches ${req.params.streamerId}.`);
        }
        res.status(200).json(streamer.getStreamerInfo());
    }
    GET.apiDoc = {
        summary: 'Returns a single streamer',
        operationId: 'getOneStreamer',
        parameters: [
            {
                name: 'streamerId',
                in: 'path',
                required: true,
                schema: {
                    type: 'string'
                }
            }
        ],
        responses: {
            200: {
                description: 'Streamer data',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Streamer'
                        }
                    }
                }
            }
        }
    };
    return operations;
}
