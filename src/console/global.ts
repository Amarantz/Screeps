declare function deref(ref: string): RoomObject | null;
global.deref = (ref: string):RoomObject | null => (Game.getObjectById(ref) || Game.flags[ref] || Game.creeps[ref] || Game.spawns[ref] || null);
declare function derefRoomPosition(protoPos: ProtoPos): RoomPosition;
global.derefRoomPosition = (protoPos: ProtoPos): RoomPosition =>(
    new RoomPosition(protoPos.x, protoPos.y, protoPos.roomName) )
