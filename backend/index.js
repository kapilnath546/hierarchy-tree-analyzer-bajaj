const express = require('express');
const cors = require('cors');

const app = express();

// 
app.use(cors());
app.use(express.json());

// 
const USER_ID            = 'kapilbajaj_24042000';
const EMAIL_ID           = 'kapil.bajaj@college.edu';
const COLLEGE_ROLL_NUMBER = '21CS1001';

// 

/**
 * Validate an edge format: exactly one "->", single uppercase A-Z on both sides,
 * and no self-loops.
 */
function isValidEntry(entry) {
  if (!entry.includes('->')) return false;
  const idx = entry.indexOf('->');
  if (entry.indexOf('->', idx + 1) !== -1) return false;

  const parent = entry.slice(0, idx);
  const child  = entry.slice(idx + 2);

  if (!/^[A-Z]$/.test(parent)) return false;
  if (!/^[A-Z]$/.test(child))  return false;

  if (parent === child) return false; // Self-loop

  return true;
}

// Union-Find for Connected Components
class UnionFind {
  constructor() {
    this.parent = {};
    this.rank   = {};
  }
  find(x) {
    if (this.parent[x] === undefined) { this.parent[x] = x; this.rank[x] = 0; }
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  union(x, y) {
    const px = this.find(x);
    const py = this.find(y);
    if (px === py) return;
    if (this.rank[px] < this.rank[py]) {
      this.parent[px] = py;
    } else if (this.rank[px] > this.rank[py]) {
      this.parent[py] = px;
    } else {
      this.parent[py] = px;
      this.rank[px]++;
    }
  }
}

/** Recursively build a tree object. Sort children lexicographically. */
function buildTree(node, childrenMap) {
  const obj = {};
  const kids = childrenMap[node] || [];
  // Lexicographical sorting for deterministic tree rendering
  for (const child of kids.slice().sort()) {
    obj[child] = buildTree(child, childrenMap);
  }
  return obj;
}

/** Compute the depth of a tree (longest root-to-leaf path in nodes). */
function treeDepth(node, childrenMap) {
  const kids = childrenMap[node] || [];
  if (kids.length === 0) return 1;
  return 1 + Math.max(...kids.map(k => treeDepth(k, childrenMap)));
}

// 

function processData(rawData) {
  const invalidEntries = [];
  const duplicateEdges = [];
  
  const seenEdges = new Set();
  
  const childrenMap = {}; // parent -> [children]
  const parentMap   = {}; // child -> parent
  const allNodes    = new Set();

  const acceptedEdges = [];

  // Step 1: Parse and Filter Input
  for (const raw of rawData) {
    const entry = raw.trim();

    if (!isValidEntry(entry)) {
      invalidEntries.push(entry);
      continue;
    }

    if (seenEdges.has(entry)) {
      if (!duplicateEdges.includes(entry)) duplicateEdges.push(entry);
      continue;
    }

    seenEdges.add(entry);
    const [parent, child] = entry.split('->');

    // Multi-parent rule: If child already has a parent, discard this edge silently.
    if (parentMap[child] !== undefined) {
      continue;
    }

    // Accept this edge
    parentMap[child] = parent;
    if (!childrenMap[parent]) childrenMap[parent] = [];
    childrenMap[parent].push(child);
    
    acceptedEdges.push({ parent, child });
    allNodes.add(parent);
    allNodes.add(child);
  }

  // Step 2: Separate components using Union-Find on accepted edges ONLY.
  const uf = new UnionFind();
  for (const node of allNodes) uf.find(node);

  for (const { parent, child } of acceptedEdges) {
    uf.union(parent, child);
  }

  const components = {};
  for (const node of allNodes) {
    const rep = uf.find(node);
    if (!components[rep]) components[rep] = [];
    components[rep].push(node);
  }

  // Step 3: Classify each component and find roots
  const hierarchies = [];

  for (const compNodes of Object.values(components)) {
    // Find nodes with indegree 0 (no parent) inside this component
    const indegreeZeroNodes = compNodes.filter(n => parentMap[n] === undefined);

    // Because every node in acceptedEdges has at most 1 parent (in-degree <= 1),
    // a connected component will have exactly 1 node with in-degree 0 IF it's a tree,
    // and exactly 0 nodes with in-degree 0 IF it is a cycle.
    
    if (indegreeZeroNodes.length === 1) {
      // Pure tree component
      const root = indegreeZeroNodes[0];
      hierarchies.push({
        root,
        tree: { [root]: buildTree(root, childrenMap) },
        depth: treeDepth(root, childrenMap)
      });
    } else if (indegreeZeroNodes.length === 0) {
      // Cyclic component (every node has exactly 1 parent)
      // Root rule for pure cycle: Lexicographically smallest node
      const root = compNodes.slice().sort()[0];
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true
      });
    } else {
      // Edge case safety (should mathematically never happen with out valid edge constraints)
      const root = indegreeZeroNodes.slice().sort()[0];
      hierarchies.push({
        root,
        tree: { [root]: buildTree(root, childrenMap) },
        depth: treeDepth(root, childrenMap)
      });
    }
  }

  // Step 4: Sort components globally
  // Acyclic first, then cyclic. Lexicographically by root.
  // Actually, standardizing purely on lexicographical order of the root matches the spec.
  hierarchies.sort((a, b) => a.root.localeCompare(b.root));

  // Step 5: Summary
  let total_trees = 0;
  let total_cycles = 0;
  let largest_tree_root = '';
  let maxDepth = -Infinity;

  for (const h of hierarchies) {
    if (h.has_cycle) {
      total_cycles++;
    } else {
      total_trees++;
      // Tie breaker for largest_tree_root: Greatest depth, then lexicographically smaller root.
      // Because we already sorted `hierarchies` lexicographically, if `h.depth === maxDepth`, 
      // the first one we encounter is the lexicographically smallest. 
      // We only update if strictly greater.
      if (h.depth > maxDepth) {
        maxDepth = h.depth;
        largest_tree_root = h.root;
      }
    }
  }

  const summary = {
    total_trees,
    total_cycles,
    largest_tree_root
  };

  return { invalidEntries, duplicateEdges, hierarchies, summary };
}

// 

app.post('/bfhl', (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: '"data" must be an array of strings.' });
    }

    const { invalidEntries, duplicateEdges, hierarchies, summary } = processData(data);

    return res.json({
      user_id:              USER_ID,
      email_id:             EMAIL_ID,
      college_roll_number:  COLLEGE_ROLL_NUMBER,
      hierarchies,
      invalid_entries:      invalidEntries,
      duplicate_edges:      duplicateEdges,
      summary,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Health-check
app.get('/', (_req, res) => res.json({ status: 'ok', message: 'Hierarchy Tree Analyzer API is running.' }));

// 
// Only start server if this file is run directly (useful for testing)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

module.exports = { app, processData };
