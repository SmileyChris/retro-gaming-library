import { TOPOLOGIES } from "./director.js";

export function applyTopology(world, clusters, mode) {
  const topo = mode.topology || TOPOLOGIES.LINEAR;

  if (topo === TOPOLOGIES.LINEAR) {
    connectLinear(world, clusters, mode);
  } else if (topo === TOPOLOGIES.HUB) {
    connectHub(world, clusters, mode);
  } else if (topo === TOPOLOGIES.BRANCHING) {
    connectBranching(world, clusters, mode);
  } else {
    // Fallback to linear
    connectLinear(world, clusters, mode);
  }
}

function connectLinear(world, clusters, mode) {
  for (let i = 0; i < clusters.length - 1; i++) {
    const current = clusters[i];
    const next = clusters[i + 1];

    let lockConfig = generateLock(mode, i, current);
    connectRooms(world, current, next, "east", "west", lockConfig);
  }
}

function connectHub(world, clusters, mode) {
  // Cluster 0 is the "Central Hub"
  // All other clusters connect to it directly
  const central = clusters[0];
  const directions = [
    "north",
    "east",
    "west",
    "south",
    "northeast",
    "northwest",
  ]; // We need more dirs if many zones

  for (let i = 1; i < clusters.length; i++) {
    const target = clusters[i];
    // Ensure we don't run out of directions, loop around if needed (or reuse with suffix?)
    // For simplicity in CLI, stick to standard dirs. If > 4, maybe daisy chain?
    const dir = directions[(i - 1) % directions.length];
    const backDir = getOppositeDir(dir);

    let lockConfig = generateLock(mode, i, central);
    connectRooms(world, central, target, dir, backDir, lockConfig);
  }
}

function connectBranching(world, clusters, mode) {
  // Tree structure. 0 -> 1, 0 -> 2. Then 1 -> 3, 1 -> 4...
  // Queue based connection?
  // Let's do a simple binary treeish

  // i=0 is root.
  // children of i are 2*i + 1 and 2*i + 2

  for (let i = 0; i < clusters.length; i++) {
    const leftIdx = 2 * i + 1;
    const rightIdx = 2 * i + 2;

    if (leftIdx < clusters.length) {
      let lockConfig = generateLock(mode, leftIdx, clusters[i]);
      connectRooms(
        world,
        clusters[i],
        clusters[leftIdx],
        "east",
        "west",
        lockConfig
      );
    }

    if (rightIdx < clusters.length) {
      let lockConfig = generateLock(mode, rightIdx, clusters[i]);
      connectRooms(
        world,
        clusters[i],
        clusters[rightIdx],
        "south",
        "north",
        lockConfig
      );
    }
  }
}

function generateLock(mode, index, keyPlacementRoom) {
  if (Math.random() < mode.lockChance) {
    const keyId = `key_zone_${index}`;
    const keyName = `Access Card ${index}`;
    const keyItem = {
      id: keyId,
      name: keyName,
      type: "KEY",
      description: `Unlocks the path to sector ${index}.`,
      metadata: { gem: true },
    };

    // Place key in the 'from' room (simplest solvable graph)
    // In advanced version, we traverse graph backwards to find a leaf.
    keyPlacementRoom.items.push(keyItem);

    return {
      keyId,
      msg: `Security Gate Active. Authorization '${keyName}' required.`,
    };
  }
  return null;
}

function getOppositeDir(dir) {
  const map = {
    north: "south",
    south: "north",
    east: "west",
    west: "east",
    northeast: "southwest",
    northwest: "southeast",
  };
  return map[dir] || "back";
}

function connectRooms(world, roomA, roomB, dirA, dirB, lockConfig = null) {
  if (!roomA || !roomB) return;

  roomA.exits[dirA] = roomB.id;
  roomB.exits[dirB] = roomA.id;

  if (lockConfig) {
    if (!roomA.locks) roomA.locks = {};
    if (!roomB.locks) roomB.locks = {};

    roomA.locks[dirA] = lockConfig;
    roomB.locks[dirB] = lockConfig;
  }
}
