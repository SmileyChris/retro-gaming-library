/**
 * Validates that all rooms are reachable from the start room.
 * @param {Object} world - The generated world object
 * @returns {boolean}
 */
export function validateConnectivity(world) {
  if (!world.playerStart || !world.rooms[world.playerStart]) return false;

  const visited = new Set();
  const queue = [world.playerStart];

  while (queue.length > 0) {
    const roomId = queue.shift();
    if (visited.has(roomId)) continue;
    visited.add(roomId);

    const room = world.rooms[roomId];
    Object.values(room.exits).forEach((targetId) => {
      if (targetId && !visited.has(targetId)) {
        queue.push(targetId);
      }
    });
  }

  // Check if we visited all generated rooms
  const totalRooms = Object.keys(world.rooms).length;
  // We strictly want complete connectivity
  return visited.size === totalRooms;
}
