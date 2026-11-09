// Shared hydraulic topology, pipe routing and flow-state evaluation.
// The original card still owns its artwork. This module owns hydraulic decisions.
const HPC_NETWORK = (() => {
  const isSource = node => HPC_FREE.byType[node?.type]?.group === 'source';

  function graph(plan) {
    const nodes = new Map(plan.components.map(node => [node.id, node]));
    const incoming = new Map(plan.components.map(node => [node.id, []]));
    const outgoing = new Map(plan.components.map(node => [node.id, []]));
    const adjacent = new Map(plan.components.map(node => [node.id, []]));
    for (const edge of plan.connections) {
      if (!nodes.has(edge.from) || !nodes.has(edge.to)) continue;
      incoming.get(edge.to).push(edge);
      outgoing.get(edge.from).push(edge);
      adjacent.get(edge.from).push({ edge, neighbor: edge.to });
      adjacent.get(edge.to).push({ edge, neighbor: edge.from });
    }
    return { nodes, incoming, outgoing, adjacent };
  }

  // A physically connected top outlet -> top inlet establishes buffer order.
  // The lower return runs in the opposite direction and must not reorder tanks.
  function orderedBuffers(plan) {
    const buffers = plan.components.filter(n => n.type === 'buffer');
    const bufferIds = new Set(buffers.map(n => n.id));
    const next = new Map(buffers.map(n => [n.id, []]));
    const indegree = new Map(buffers.map(n => [n.id, 0]));
    for (const e of plan.connections) {
      if (!bufferIds.has(e.from) || !bufferIds.has(e.to) ||
          e.from_port !== 'top_out' || e.to_port !== 'top_in') continue;
      if (next.get(e.from).includes(e.to)) continue;
      next.get(e.from).push(e.to);
      indegree.set(e.to, indegree.get(e.to) + 1);
    }
    const order = new Map(buffers.map((n, i) => [n.id, i]));
    const sorted = [], queue = buffers.filter(n => indegree.get(n.id) === 0);
    while (queue.length) {
      queue.sort((a, b) => order.get(a.id) - order.get(b.id));
      const current = queue.shift();
      sorted.push(current);
      for (const id of next.get(current.id)) {
        indegree.set(id, indegree.get(id) - 1);
        if (indegree.get(id) === 0) queue.push(buffers.find(n => n.id === id));
      }
    }
    // A cycle is invalid as a series, but it must never lose a tank.
    return [...sorted, ...buffers.filter(n => !sorted.includes(n))];
  }

  function flowStates(plan, hass) {
    const { nodes, incoming, outgoing, adjacent } = graph(plan);
    const flowing = new Set();
    const state = id => id ? HPC_FREE.state(hass, id) : null;
    const measured = id => {
      const reading = state(id);
      if (!reading) return null;
      if (reading.number !== null) return reading.number > 0;
      return HPC_FREE.active(reading);
    };
    const mappedFlow = edge => edge.flow_entity ? measured(edge.flow_entity) : null;
    const pumpEntity = node => {
      if (node.type === 'pump') return node.sensors?.state || node.sensors?.pump;
      if (isSource(node) || node.type === 'heating_circuit') return node.sensors?.pump;
      return null;
    };
    const pumpState = node => {
      // A measured zero is stronger evidence than an on-command.
      const volumeId = node.sensors?.volume;
      const volumeState = state(volumeId);
      if (volumeState?.number !== null && volumeState?.number <= 0) return false;
      const reading = state(pumpEntity(node));
      if (reading) return HPC_FREE.active(reading);
      if (volumeState?.number > 0) return true;
      return null;
    };
    const blocked = node => pumpState(node) === false;
    const stoppedCharge = new Set(), stoppedReturn = new Set();

    for (const tank of plan.components.filter(n => n.type === 'dhw_tank')) {
      const feeders = (incoming.get(tank.id) || []).filter(e => e.to_port === 'coil_in');
      const returns = (outgoing.get(tank.id) || []).filter(e => e.from_port === 'coil_out');
      if (!feeders.length || !returns.length) continue;
      const seen = new Set();
      const stoppedSupply = id => {
        if (seen.has(id)) return false;
        seen.add(id);
        const n = nodes.get(id);
        if (!n || n.type === 'dhw_tank') return false;
        if (blocked(n)) return true;
        if (isSource(n) || n.type === 'heating_circuit') return false;
        return (incoming.get(id) || []).some(e =>
          mappedFlow(e) === false || stoppedSupply(e.from));
      };
      const stopped = feeders.some(e => mappedFlow(e) === false || stoppedSupply(e.from)) ||
        returns.some(e => mappedFlow(e) === false);
      if (!stopped) continue;
      stoppedCharge.add(tank.id);
      // Stop the coil's dedicated return only, not a shared heating collector.
      const visit = (id, visited = new Set()) => {
        if (visited.has(id)) return;
        visited.add(id);
        for (const edge of outgoing.get(id) || []) {
          if (id === tank.id && edge.from_port !== 'coil_out') continue;
          const next = nodes.get(edge.to);
          if (!next) continue;
          stoppedReturn.add(edge.id);
          if (!isSource(next) && next.type !== 'dhw_tank' &&
              next.type !== 'heating_circuit' &&
              (adjacent.get(next.id) || []).length <= 2) visit(next.id, visited);
        }
      };
      visit(tank.id);
    }

    const allowed = edge => mappedFlow(edge) !== false &&
      !stoppedReturn.has(edge.id) &&
      !stoppedCharge.has(edge.from) && !stoppedCharge.has(edge.to);

    for (const edge of plan.connections)
      if (mappedFlow(edge) === true && allowed(edge)) flowing.add(edge.id);

    for (const pump of plan.components.filter(n => pumpState(n) === true)) {
      const queue = [pump.id], visited = new Set();
      while (queue.length) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        for (const { edge, neighbor } of adjacent.get(id) || []) {
          if (!allowed(edge)) continue;
          const next = nodes.get(neighbor);
          if (!next || blocked(next)) continue;
          flowing.add(edge.id);
          // One pump is not evidence that an unrelated zone or boiler flows.
          const otherUnmeteredCircuit = (isSource(next) || next.type === 'heating_circuit') &&
            !pumpEntity(next) && !next.sensors?.volume && next.id !== pump.id;
          if (!otherUnmeteredCircuit && !visited.has(neighbor)) queue.push(neighbor);
        }
      }
    }
    return flowing;
  }

  // One orthogonal router for every non-native SVG pipe. It uses actual ports,
  // not the stored legacy X/Y values or assumptions based on a component name.
  function route({ edge, fromNode, toNode, fromShape, toShape, p, q,
                   fromSide, toSide, supplyTee = null, returnTee = null }) {
    const h = (x, y) => String(x) + ' ' + String(y);
    let d;
    if (p.x > q.x + 8 || fromSide === 'L' || toSide === 'R') {
      const farX = p.x + (fromSide === 'L' ? -36 : 38);
      const entryX = q.x + (toSide === 'R' ? 36 : -36);
      const laneY = p.y < q.y - 120
        ? Math.max(fromShape.y + fromShape.h + 32, toShape.y - 32)
        : p.y > q.y + 120
        ? Math.min(fromShape.y - 32, toShape.y + toShape.h + 32)
        : Math.max(fromShape.y + fromShape.h, toShape.y + toShape.h) + 38;
      d = 'M' + h(p.x, p.y) + ' H' + farX + ' V' + laneY +
        ' H' + entryX + ' V' + q.y + ' H' + q.x;
    } else {
      const mid = (p.x + q.x) / 2;
      d = 'M' + h(p.x, p.y) + ' H' + mid + ' V' + q.y + ' H' + q.x;
    }
    if (toNode.type === 'dhw_tank' && edge.to_port === 'coil_in') {
      const outsideX = Math.max(p.x + 36, toShape.x + toShape.w + 42);
      const aboveY = Math.max(10, Math.min(toShape.y - 24, fromShape.y - 25, 16));
      d = 'M' + h(p.x, p.y) + ' H' + outsideX + ' V' + aboveY +
        ' H' + (q.x - 34) + ' V' + q.y + ' H' + q.x;
    }
    const bufferCoilReturn = fromNode.type === 'dhw_tank' &&
      edge.from_port === 'coil_out' && toNode.type === 'buffer' &&
      edge.to_port === 'bottom_in';
    const bufferCoilSupply = fromNode.type === 'buffer' &&
      toNode.type === 'pump' && toShape.inline &&
      edge.from_port === 'top_out' && edge.to_port === 'in';
    if (bufferCoilReturn && !returnTee) {
      const below = Math.max(toShape.y + toShape.h + 32, fromShape.y + fromShape.h + 34);
      d = 'M' + h(p.x, p.y) + ' H' + (p.x - 70) + ' V' + below +
        ' H' + (q.x - 35) + ' V' + q.y + ' H' + q.x;
    } else if (bufferCoilSupply && !supplyTee) {
      const laneX = Math.min(q.x - 30, p.x + 35);
      d = 'M' + h(p.x, p.y) + ' H' + laneX + ' V' + q.y + ' H' + q.x;
    }
    if (supplyTee) {
      const viaX = Math.max(supplyTee.x, p.x + 20);
      d = 'M' + h(p.x, p.y) + ' H' + viaX + ' V' + q.y +
        ' H' + (q.x - 30) + ' H' + q.x;
    } else if (returnTee) {
      const below = toNode.type === 'buffer'
        ? Math.max(toShape.y + toShape.h + 32, fromShape.y + fromShape.h + 34)
        : Math.max(555, fromShape.y + fromShape.h + 35);
      d = 'M' + h(p.x, p.y) + ' H' + (p.x - 70) + ' V' + below +
        ' H' + (q.x - 35) + ' V' + q.y + ' H' + q.x;
    }
    return d;
  }

  return { graph, orderedBuffers, flowStates, route };
})();
