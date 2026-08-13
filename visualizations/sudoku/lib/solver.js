// Backtracking sudoku solver with pluggable, UI-selectable strategies.
//
// The solver runs once, up front, and records an ordered event log. That log is
// the contract everything downstream consumes: the shared player walks it, and
// each cell's split-flap replays its own events. Solving is decoupled from
// animating on purpose so playback can pause/step/scrub.
//
// Event shape — the whole contract, identical across every strategy:
//   { kind: 'fill' | 'erase', row, col, value, prevValue, depth }
//     fill  = place or advance a value at a cell   -> forward, cell flaps DOWN
//     erase = give up on a cell, blank it          -> backtrack, cell flaps UP
//   `prevValue` is what the cell held before this event, making every event
//   invertible (undo a fill -> restore prevValue; undo an erase -> restore the
//   erased value). That invertibility gives the player step-back/scrub for free.
//
// Because the contract is strategy-agnostic, switching algorithms in the UI just
// means re-running solve() with a different `strategy` key and reloading the log.
// Different strategies differ only in (a) which empty cell they pick next and
// (b) whether they prune provably-dead branches before recursing — so the SAME
// puzzle can thrash under `naive` and glide under `mrv`, which is the whole point
// of making it switchable.

const N = 9;

// Parse an 81-cell puzzle string into an Int8Array grid (0 = blank).
// Accepts '.', '0', or space for blanks; whitespace/newlines are ignored.
export function parsePuzzle(str) {
  const cells = str.replace(/\s+/g, '');
  if (cells.length !== 81) {
    throw new Error(`Puzzle must have 81 cells, got ${cells.length}`);
  }
  const grid = new Int8Array(81);
  for (let i = 0; i < 81; i++) {
    const c = cells[i];
    grid[i] = c === '.' || c === '0' ? 0 : Number(c);
  }
  return grid;
}

// Boolean mask of which cells are givens (clues) vs blanks to be solved.
export function givensMask(grid) {
  return Array.from(grid, (v) => v !== 0);
}

// Legal values for empty cell `idx`, ascending, given the current grid.
function legalValues(grid, idx) {
  const r = (idx / N) | 0;
  const c = idx % N;
  const br = r - (r % 3);
  const bc = c - (c % 3);
  let mask = 0; // bit v set => value v is already used by a peer
  for (let i = 0; i < N; i++) {
    let v = grid[r * N + i];
    if (v) mask |= 1 << v;
    v = grid[i * N + c];
    if (v) mask |= 1 << v;
    v = grid[(br + ((i / 3) | 0)) * N + (bc + (i % 3))];
    if (v) mask |= 1 << v;
  }
  const vals = [];
  for (let v = 1; v <= N; v++) if (!(mask & (1 << v))) vals.push(v);
  return vals;
}

// --- cell-selection strategies -------------------------------------------------

// Naive: first empty cell in row-major order. Ignores how constrained it is, so
// it commits to arbitrary cells and backtracks a lot.
function firstEmpty(grid) {
  for (let i = 0; i < 81; i++) if (grid[i] === 0) return i;
  return -1;
}

// MRV (minimum remaining values): the empty cell with the fewest legal values.
// Attacking the most-constrained cell first collapses the search tree. A cell
// with 0 candidates is returned immediately — it's a dead-end the caller detects
// by finding no values to try, and backtracks at once.
function mrvCell(grid) {
  let best = -1;
  let bestCount = N + 1;
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    const n = legalValues(grid, i).length;
    if (n < bestCount) {
      bestCount = n;
      best = i;
      if (n === 0) break; // can't be more constrained than impossible
    }
  }
  return best;
}

// --- pruning (forward checking) ------------------------------------------------

// Forward checking: after a placement, is any empty cell left with no legal
// values? If so this branch is already dead — prune before recursing.
function hasDeadCell(grid) {
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0 && legalValues(grid, i).length === 0) return true;
  }
  return false;
}

// --- strategy registry (drives the UI dropdown) --------------------------------

// The three strategies deliberately separate the two independent ideas behind
// efficient backtracking — cell ORDERING and branch PRUNING — so switching
// between them in the UI isolates the effect of each:
//   naive     -> dumb order, no pruning        (baseline thrash)
//   naive+fc  -> dumb order, smart pruning      (isolates pruning's value)
//   mrv       -> smart order, no pruning        (isolates ordering's value)
// (MRV + forward checking is intentionally omitted: MRV already picks the
// 0-candidate cell first and backtracks at once, so forward checking prunes
// nothing it doesn't already avoid — an identical trace at higher cost.)
export const STRATEGIES = {
  naive: {
    key: 'naive',
    name: 'Naive backtracking',
    description: 'First empty cell (row-major), try 1–9 in order. Maximum backtracking.',
    chooseCell: firstEmpty,
  },
  naivefc: {
    key: 'naivefc',
    name: 'Naive + forward checking',
    description: 'Same row-major order, but prune any branch that strands a cell with no legal values.',
    chooseCell: firstEmpty,
    prune: hasDeadCell,
  },
  mrv: {
    key: 'mrv',
    name: 'MRV (fewest candidates)',
    description: 'Always fill the most-constrained empty cell first. Far less backtracking.',
    chooseCell: mrvCell,
  },
};

// Metadata for building the UI selector, without exposing the function refs.
export function listStrategies() {
  return Object.values(STRATEGIES).map(({ key, name, description }) => ({
    key,
    name,
    description,
  }));
}

// --- solver core ---------------------------------------------------------------

// Solve `puzzle` (string or grid) with the chosen `strategy`, returning the
// solution plus the full event log. `maxEvents` is a runaway guard: pathological
// puzzles under naive backtracking can explore millions of nodes, so we stop and
// report `truncated: true` rather than hang.
export function solve(puzzle, { strategy = 'naive', maxEvents = 300000 } = {}) {
  const strat = STRATEGIES[strategy];
  if (!strat) throw new Error(`Unknown strategy: ${strategy}`);

  const grid = typeof puzzle === 'string' ? parsePuzzle(puzzle) : Int8Array.from(puzzle);
  const givens = givensMask(grid);
  const events = [];
  let truncated = false;

  const emit = (kind, idx, value, prevValue, depth) => {
    if (events.length >= maxEvents) {
      truncated = true;
      return true;
    }
    events.push({ kind, row: (idx / N) | 0, col: idx % N, value, prevValue, depth });
    return false;
  };

  const { chooseCell, prune } = strat;

  const recurse = (depth) => {
    if (truncated) return false;
    const idx = chooseCell(grid);
    if (idx === -1) return true; // no empty cells: solved

    for (const v of legalValues(grid, idx)) {
      const prevValue = grid[idx]; // 0 on first trial, previous trial value after
      grid[idx] = v;
      if (emit('fill', idx, v, prevValue, depth)) return false;
      // Only descend if forward checking (when enabled) hasn't already killed it.
      if (!(prune && prune(grid))) {
        if (recurse(depth + 1)) return true;
        if (truncated) return false;
      }
      // v failed; the next legal value overwrites in place (another 'fill').
    }

    // All values exhausted at this cell: blank it and backtrack. Skip the erase
    // if we never placed anything (a 0-candidate cell), which would be a no-op flap.
    if (grid[idx] !== 0) {
      const erased = grid[idx];
      grid[idx] = 0;
      emit('erase', idx, 0, erased, depth);
    }
    return false;
  };

  const solved = recurse(0);

  return {
    solved,
    truncated,
    strategy,
    grid: Array.from(grid),
    givens,
    events,
    stats: summarize(events, solved, truncated),
  };
}

function summarize(events, solved, truncated) {
  let fills = 0;
  let erases = 0;
  let maxDepth = 0;
  for (const e of events) {
    if (e.kind === 'fill') fills++;
    else erases++;
    if (e.depth > maxDepth) maxDepth = e.depth;
  }
  return { total: events.length, fills, erases, maxDepth, solved, truncated };
}
