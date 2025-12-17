// Graph definitions
const DIRECTIONS = ["north", "east", "south", "west"];
const OPPOSITE = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

/**
 * Generates a graph of connected nodes representing a zone layout.
 * @param {string} type - "VINE", "LOOP", "HUB"
 * @param {number} size - Approximate number of rooms
 * @returns {object} { nodes: [], edges: [], startNode: id }
 */
export function generateZoneTopology(type, size = 5) {
  const context = {
    nodes: [],
    edges: [], // { from, to, dir }
    pointer: 0,
    map: {}, // x,y -> nodeId
  };

  // Always start at 0,0
  addNode(context, 0, 0, "start");

  switch (type) {
    case "LOOP":
      generateLoop(context, size);
      break;
    case "HUB":
      generateHub(context, size);
      break;
    case "GRID":
      generateGrid(context, size);
      break;
    case "GAUNTLET":
      generateGauntlet(context, size);
      break;
    case "VINE":
    default:
      generateVine(context, size);
      break;
  }

  return {
    nodes: context.nodes,
    edges: context.edges,
    startNode: context.nodes[0].id,
  };
}

// ALGORITHMS

function generateGrid(ctx, size) {
  const side = Math.ceil(Math.sqrt(size));
  let count = 0;

  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      if (count >= size) break;

      let node = getNodeAt(ctx, x, y);
      if (!node) {
        node = addNode(ctx, x, y);
      }
      count++;

      const west = getNodeAt(ctx, x - 1, y);
      if (west) connectNodes(ctx, west, node, "east");

      const north = getNodeAt(ctx, x, y - 1);
      if (north) connectNodes(ctx, north, node, "south");
    }
  }
}

function generateGauntlet(ctx, size) {
  let current = ctx.nodes[0];
  let remaining = size - 1;
  let counter = 0;

  while (remaining > 0) {
    const neighbors = getFreeNeighbors(ctx, current.x, current.y);
    if (neighbors.length === 0) break;

    const dir = neighbors[Math.floor(Math.random() * neighbors.length)];
    const newNode = addNodeInDir(ctx, current, dir);

    counter++;
    if (counter % 3 === 0) {
      newNode.type = "ARENA";
    }

    current = newNode;
    remaining--;
  }
}

function generateVine(ctx, size) {
  // Main spine with randomized branches
  let current = ctx.nodes[0];
  let remaining = size - 1;

  while (remaining > 0) {
    // 70% chance to extend main spine, 30% to branch
    // Or just random walk? Random walk ensures connectivity but might overlap.
    // We use a grid map to prevent overlap.
    const neighbors = getFreeNeighbors(ctx, current.x, current.y);
    if (neighbors.length === 0) {
      // Dead end, backtrack to start or random node
      current = ctx.nodes[Math.floor(Math.random() * ctx.nodes.length)];
      continue;
    }

    const dir = neighbors[Math.floor(Math.random() * neighbors.length)];
    const newNode = addNodeInDir(ctx, current, dir);
    remaining--;
    current = newNode; // Walk
  }
}

function generateLoop(ctx, size) {
  // Create a circle chain, then connect start to end
  // Naive square loop for small sizes
  // Or 'snake' that tries to bite its tail.

  // 1. Generate a path of size - 1
  let current = ctx.nodes[0];
  let remaining = size - 1;
  const path = [current];

  while (remaining > 0) {
    const neighbors = getFreeNeighbors(ctx, current.x, current.y);
    // Bias towards 'circling' is hard on grid without complex logic.
    // Simple approach: Random walk, but prioritize moving AWAY from start initially,
    // then towards start when size is large?

    // Better: Just make a reliable Ring?
    // Let's implement a reliable random walker that tracks "distance from start".

    if (neighbors.length === 0) {
      // Backtrack
      current = ctx.nodes.find(
        (n) => getFreeNeighbors(ctx, n.x, n.y).length > 0
      );
      if (!current) break; // Trapped
      continue;
    }

    const dir = neighbors[Math.floor(Math.random() * neighbors.length)];
    const newNode = addNodeInDir(ctx, current, dir);
    path.push(newNode);
    current = newNode;
    remaining--;
  }

  // 2. Try to connect End to Start (or close to start)
  const end = current;
  const start = ctx.nodes[0];

  // Check if adjacent?
  if (isAdjacent(end, start)) {
    connectNodes(ctx, end, start);
  } else {
    // Simplest shortcut: Look for any early node adjacent to End
    // Prefer Start, but if not, index 0, 1, 2...
    for (let i = 0; i < path.length - 2; i++) {
      if (isAdjacent(end, path[i])) {
        connectNodes(ctx, end, path[i]);
        break;
      }
    }
  }
}

function generateHub(ctx, size) {
  // Central node 0.
  // Spoke length
  const hub = ctx.nodes[0];
  const branches = 3 + Math.floor(Math.random() * 2); // 3-4 branches
  let remaining = size - 1;

  let dirIdx = 0;
  while (remaining > 0) {
    const dir = DIRECTIONS[dirIdx % 4];

    // Extend line in this direction
    let curr = hub;
    // Check if immediate spot is free, if not, skip branch or extend existing?
    // Let's extend from the TIP of that branch.
    // Find existing node in that dir?
    let nextPos = { x: curr.x + dx(dir), y: curr.y + dy(dir) };
    let nextNode = getNodeAt(ctx, nextPos.x, nextPos.y);

    while (nextNode) {
      curr = nextNode;
      nextPos = { x: curr.x + dx(dir), y: curr.y + dy(dir) };
      nextNode = getNodeAt(ctx, nextPos.x, nextPos.y);
    }

    // Now curr is the tip. Add new node.
    if (remaining > 0) {
      addNodeInDir(ctx, curr, dir);
      remaining--;
    }
    dirIdx++;
  }
}

// HELPERS

function addNode(ctx, x, y, type = "room") {
  const id = `node_${ctx.pointer++}`;
  const node = { id, x, y, type, exits: {} };
  ctx.nodes.push(node);
  ctx.map[`${x},${y}`] = node;
  return node;
}

function addNodeInDir(ctx, fromNode, dir) {
  const nx = fromNode.x + dx(dir);
  const ny = fromNode.y + dy(dir);
  const newNode = addNode(ctx, nx, ny);
  connectNodes(ctx, fromNode, newNode, dir);
  return newNode;
}

function connectNodes(ctx, from, to, dirHint = null) {
  let dir = dirHint;
  if (!dir) {
    // Infer direction
    if (to.y < from.y) dir = "north";
    else if (to.y > from.y) dir = "south";
    else if (to.x > from.x) dir = "east";
    else dir = "west";
  }

  ctx.edges.push({ from: from.id, to: to.id, dir });
  ctx.edges.push({ from: to.id, to: from.id, dir: OPPOSITE[dir] });

  from.exits[dir] = to.id;
  to.exits[OPPOSITE[dir]] = from.id;
}

function getFreeNeighbors(ctx, x, y) {
  return DIRECTIONS.filter((dir) => {
    const nx = x + dx(dir);
    const ny = y + dy(dir);
    return !ctx.map[`${nx},${ny}`];
  });
}

function getNodeAt(ctx, x, y) {
  return ctx.map[`${x},${y}`];
}

function isAdjacent(n1, n2) {
  return Math.abs(n1.x - n2.x) + Math.abs(n1.y - n2.y) === 1;
}

function dx(dir) {
  if (dir === "east") return 1;
  if (dir === "west") return -1;
  return 0;
}

function dy(dir) {
  if (dir === "south") return 1;
  if (dir === "north") return -1;
  return 0;
}
