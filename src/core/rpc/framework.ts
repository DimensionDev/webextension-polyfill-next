import { AsyncCall } from "async-call-rpc";
import type { FrameworkImplementation } from "../../types/RPC.js";
import { isDebugMode } from "../debugger/enabled.js";
import { WebkitChannel } from "./channel.js";
import { SamePageDebugChannel } from "./debug-channel.js";

// TODO: provide local implementation
export const FrameworkRPC = AsyncCall<FrameworkImplementation>({}, {
    log: false,
    channel: isDebugMode ? new SamePageDebugChannel('client') : new WebkitChannel(),
    strict: false,
})
