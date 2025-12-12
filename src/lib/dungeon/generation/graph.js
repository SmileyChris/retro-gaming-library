/**
 * Helper class for building the dungeon graph.
 */
export class DungeonGraph {
  constructor() {
    this.nodes = new Map(); // id -> Node
    this.edges = []; // { from, to, dir }
    this.adjacency = new Map(); // id -> [neighbors]
  }

  addNode(node) {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, []);
    }
  }

  connect(nodeAId, nodeBId, dirA, dirB) {
    this.edges.push({ from: nodeAId, to: nodeBId, dir: dirA });
    this.edges.push({ from: nodeBId, to: nodeAId, dir: dirB });

    this.adjacency.get(nodeAId).push(nodeBId);
    this.adjacency.get(nodeBId).push(nodeAId);
  }

  getNeighbors(nodeId) {
    return this.adjacency.get(nodeId) || [];
  }

  // Returns a set of reachable node IDs
  getReachable(startNodeId) {
    const visited = new Set();
    const stack = [startNodeId];
    while (stack.length > 0) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      const neighbors = this.adjacency.get(current) || [];
      neighbors.forEach((n) => stack.push(n));
    }
    return visited;
  }

  // BFS for shortest path distance
  getDistance(startNodeId, endNodeId) {
    const queue = [[startNodeId, 0]];
    const visited = new Set();
    while (queue.length > 0) {
      const [current, dist] = queue.shift();
      if (current === endNodeId) return dist;

      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = this.adjacency.get(current) || [];
        neighbors.forEach((n) => {
          if (!visited.has(n)) queue.push([n, dist + 1]);
        });
      }
    }
    return -1; // Unreachable
  }

  // Get nodes with only 1 connection (dead ends)
  getLeaves() {
    const leaves = [];
    this.adjacency.forEach((neighbors, id) => {
      if (neighbors.length === 1) leaves.push(this.nodes.get(id));
    });
    return leaves;
  }
}
