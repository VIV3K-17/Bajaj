const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const FULL_NAME = "Vivek Sesetti";
const DOB = "26062006";
const EMAIL = "viveksesetti@gmail.com";
const ROLL = "AP23110011595";

function isValidEdge(str) {
  if (!str) return false;
  str = str.trim();
  if (!/^[A-Z]->[A-Z]$/.test(str)) return false;

  const [p, c] = str.split("->");
  if (p === c) return false;

  return true;
}

function buildGraph(edges) {
  const graph = {};
  const indegree = {};

  edges.forEach(([p, c]) => {
    if (!graph[p]) graph[p] = [];
    graph[p].push(c);

    indegree[c] = (indegree[c] || 0) + 1;
    if (!indegree[p]) indegree[p] = indegree[p] || 0;
  });

  return { graph, indegree };
}

function detectCycle(graph, node, visited, recStack) {
  if (!visited[node]) {
    visited[node] = true;
    recStack[node] = true;

    for (const neighbor of graph[node] || []) {
      if (!visited[neighbor] && detectCycle(graph, neighbor, visited, recStack))
        return true;
      else if (recStack[neighbor]) return true;
    }
  }
  recStack[node] = false;
  return false;
}

function buildTree(graph, root) {
  function dfs(node) {
    const children = {};
    for (const child of graph[node] || []) {
      children[child] = dfs(child);
    }
    return children;
  }

  return { [root]: dfs(root) };
}

function getDepth(graph, root) {
  function dfs(node) {
    if (!graph[node] || graph[node].length === 0) return 1;
    let max = 0;
    for (const child of graph[node]) {
      max = Math.max(max, dfs(child));
    }
    return 1 + max;
  }
  return dfs(root);
}

app.post("/bfhl", (req, res) => {
  const input = req.body.data || [];

  const invalid = [];
  const duplicates = [];
  const seen = new Set();
  const edges = [];

  input.forEach((item) => {
    const trimmed = item.trim();

    if (!isValidEdge(trimmed)) {
      invalid.push(item);
      return;
    }

    if (seen.has(trimmed)) {
      if (!duplicates.includes(trimmed)) duplicates.push(trimmed);
      return;
    }

    seen.add(trimmed);
    const [p, c] = trimmed.split("->");
    edges.push([p, c]);
  });

  const { graph, indegree } = buildGraph(edges);

  const nodes = new Set();
  edges.forEach(([p, c]) => {
    nodes.add(p);
    nodes.add(c);
  });

  let roots = [...nodes].filter((n) => !indegree[n]);

  if (roots.length === 0) {
    roots = [Array.from(nodes).sort()[0]];
  }

  const hierarchies = [];
  let totalTrees = 0;
  let totalCycles = 0;

  let maxDepth = 0;
  let largestRoot = "";

  roots.forEach((root) => {
    const visited = {};
    const recStack = {};

    const hasCycle = detectCycle(graph, root, visited, recStack);

    if (hasCycle) {
      totalCycles++;
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true,
      });
    } else {
      totalTrees++;

      const tree = buildTree(graph, root);
      const depth = getDepth(graph, root);

      if (depth > maxDepth || (depth === maxDepth && root < largestRoot)) {
        maxDepth = depth;
        largestRoot = root;
      }

      hierarchies.push({
        root,
        tree,
        depth,
      });
    }
  });

  res.json({
    user_id: `${FULL_NAME}_${DOB}`,
    email_id: EMAIL,
    college_roll_number: ROLL,
    hierarchies,
    invalid_entries: invalid,
    duplicate_edges: duplicates,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestRoot,
    },
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});