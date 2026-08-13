// Embedded puzzles (0 = blank). Source doesn't matter for the visualization; these
// are well-known, published, valid puzzles spanning a range of difficulty so we can
// measure how much naive-backtracking drama each produces and pick a watchable one.

export const PUZZLES = {
  wikipedia: {
    name: 'Wikipedia easy',
    difficulty: 'easy',
    grid: '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  },
  norvigEasy: {
    name: 'Norvig grid 1',
    difficulty: 'easy-medium',
    grid: '003020600900305001001806400008102900700000008006708200002609500800203009005010300',
  },
  escargot: {
    name: 'AI Escargot (Inkala 2006)',
    difficulty: 'very hard',
    grid: '100007090030020008009600500005300900010080002600004000300000010040000007007000300',
  },
  inkala2012: {
    name: 'Inkala 2012 "hardest"',
    difficulty: 'very hard',
    grid: '800000000003600000070090200050007000000045700000100030001000068008500010090000400',
  },
};
