// Dev-only harness: sweep every strategy against every embedded puzzle, verify
// each solution, and print trace stats. This matrix both tunes the default
// puzzle/strategy and shows the contrast the UI switcher is meant to reveal.
// Run: `node visualizations/sudoku/lib/measure.js`.

import { PUZZLES } from './puzzles.js';
import { solve, parsePuzzle, listStrategies } from './solver.js';

// Is `grid` (array of 81 numbers) a complete, legal sudoku solution?
function isComplete(grid) {
  const groupOk = (idxs) => {
    const s = new Set();
    for (const i of idxs) {
      const v = grid[i];
      if (v < 1 || v > 9 || s.has(v)) return false;
      s.add(v);
    }
    return true;
  };
  for (let r = 0; r < 9; r++) {
    if (!groupOk(Array.from({ length: 9 }, (_, c) => r * 9 + c))) return false;
  }
  for (let c = 0; c < 9; c++) {
    if (!groupOk(Array.from({ length: 9 }, (_, r) => r * 9 + c))) return false;
  }
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const idxs = [];
      for (let i = 0; i < 9; i++) idxs.push((br + ((i / 3) | 0)) * 9 + (bc + (i % 3)));
      if (!groupOk(idxs)) return false;
    }
  }
  return true;
}

// Givens preserved, no given ever touched, solution complete, and the event log
// replays from the givens back to the solved grid.
function verify(puzzleStr, result) {
  const start = parsePuzzle(puzzleStr);
  const givensKept = result.grid.every((v, i) => start[i] === 0 || start[i] === v);
  const touchedGivens = result.events.some((e) => start[e.row * 9 + e.col] !== 0);
  const complete = result.solved && isComplete(result.grid);
  const replay = Int8Array.from(start);
  for (const e of result.events) replay[e.row * 9 + e.col] = e.value;
  const replayMatches = result.solved && replay.every((v, i) => v === result.grid[i]);
  return givensKept && !touchedGivens && complete && replayMatches ? 'PASS' : 'FAIL';
}

const strategies = listStrategies();

const header = [
  'puzzle'.padEnd(26),
  'strategy'.padEnd(24),
  'solved'.padEnd(7),
  'events'.padStart(8),
  'fills'.padStart(7),
  'erases'.padStart(7),
  'depth'.padStart(6),
  'time'.padStart(9),
  'checks',
].join(' ');
console.log(header);
console.log('-'.repeat(header.length + 6));

for (const p of Object.values(PUZZLES)) {
  for (const s of strategies) {
    const t0 = process.hrtime.bigint();
    const res = solve(p.grid, { strategy: s.key, maxEvents: 300000 });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log(
      [
        p.name.padEnd(26),
        s.name.padEnd(24),
        String(res.solved).padEnd(7),
        String(res.stats.total).padStart(8),
        String(res.stats.fills).padStart(7),
        String(res.stats.erases).padStart(7),
        String(res.stats.maxDepth).padStart(6),
        `${ms.toFixed(2)}ms`.padStart(9),
        verify(p.grid, res),
      ].join(' '),
    );
  }
  console.log();
}
