import EventEmitter from "events";

class RealtimeEmitter extends EventEmitter {}

export const realtimeEmitter = new RealtimeEmitter();
