import { describe, it, expect } from "bun:test";
import { generateZoneTopology } from "../generation/topology.js";

describe("Topology Generator", () => {
  it("should generate a VINE topology", () => {
    const topo = generateZoneTopology("VINE", 10);
    expect(topo.nodes.length).toBeGreaterThan(1);
    expect(topo.startNode).toBeDefined();
    expect(topo.edges.length).toBeGreaterThan(0);

    // Check connectivity (should be single component)
    const visited = new Set();
    const stack = [topo.startNode];
    while (stack.length > 0) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id);

      topo.edges.filter((e) => e.from === id).forEach((e) => stack.push(e.to));
    }
    expect(visited.size).toBe(topo.nodes.length);
  });

  it("should generate a HUB topology", () => {
    const topo = generateZoneTopology("HUB", 10);
    // Hub should have a central node (node_0) with multiple exits
    const center = topo.nodes.find((n) => n.id === topo.startNode);
    expect(Object.keys(center.exits).length).toBeGreaterThanOrEqual(1); // At least 1 branch
    expect(topo.nodes.length).toBeGreaterThan(1);
  });

  it("should generate a LOOP topology", () => {
    const topo = generateZoneTopology("LOOP", 8);
    expect(topo.nodes.length).toBeGreaterThan(1);

    const visited = new Set();
    const stack = [topo.startNode];
    while (stack.length > 0) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      topo.edges.filter((e) => e.from === id).forEach((e) => stack.push(e.to));
    }
    expect(visited.size).toBe(topo.nodes.length);
  });

  it("should generate a GRID topology", () => {
    const topo = generateZoneTopology("GRID", 9);
    expect(topo.nodes.length).toBeGreaterThanOrEqual(5);
    // Grid nodes (internal) should have high degree (3 or 4)
    // 3x3 grid: center has 4 neighbors.
    // Let's check average degree > 2 if dense?
    // Or just existence.
    const visited = new Set();
    const stack = [topo.startNode];
    while (stack.length > 0) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      topo.edges.filter((e) => e.from === id).forEach((e) => stack.push(e.to));
    }
    expect(visited.size).toBe(topo.nodes.length);
  });

  it("should generate a GAUNTLET topology", () => {
    const topo = generateZoneTopology("GAUNTLET", 10);
    expect(topo.nodes.length).toBeGreaterThan(5);
    // Linearity check? Or check for ARENA nodes (not easy on topology object unless we expose types)
    // Current topology returns { nodes: [{id, x, y, type}], edges, startNode }
    // So we CAN check types.
    const arenas = topo.nodes.filter((n) => n.type === "ARENA");
    expect(arenas.length).toBeGreaterThan(0);
  });
});
