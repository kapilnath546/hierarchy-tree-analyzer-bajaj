const { processData } = require('./index.js');

const tests = [
  {
    name: "CASE 1 BASIC TREE",
    data: ["A->B", "A->C", "B->D"],
    expectTrees: 1,
    expectCycles: 0,
    expectRoot: "A",
    expectDepth: 3
  },
  {
    name: "CASE 2 DUPLICATES",
    data: ["A->B", "A->B", "A->B"],
    expectTrees: 1,
    expectDuplicates: ["A->B"]
  },
  {
    name: "CASE 3 INVALIDS",
    data: ["hello", "1->2", "A->", "->B", "A-B", "A->A", " A->B "],
    expectTrees: 1, // ' A->B ' is valid after trim
    expectInvalids: ["hello", "1->2", "A->", "->B", "A-B", "A->A"]
  },
  {
    name: "CASE 4 MULTI PARENT",
    data: ["A->D", "B->D"],
    expectTrees: 2, // A->D is accepted. B is a disconnected node? Wait, B->D is ignored. So B is never added to acceptedEdges. So B is not in any component!
    // Wait, let's see. If B->D is ignored, B has no accepted edges.
    // So B will not be in allNodes. Thus B is NOT a tree.
    // So total trees = 1 (A->D).
    expectTrees: 1
  },
  {
    name: "CASE 5 PURE CYCLE",
    data: ["X->Y", "Y->Z", "Z->X"],
    expectTrees: 0,
    expectCycles: 1
  },
  {
    name: "CASE 6 MULTIPLE GROUPS",
    data: ["A->B", "P->Q", "X->Y", "Y->X"],
    expectTrees: 2,
    expectCycles: 1
  },
  {
    name: "CASE 7 BIG MIXED CASE",
    data: [
      "A->B", "A->C", "B->D", "C->E", "E->F",
      "X->Y", "Y->Z", "Z->X",
      "P->Q", "Q->R",
      "G->H", "G->H", "G->I",
      "hello", "1->2", "A->"
    ],
    expectTrees: 3,
    expectCycles: 1,
    expectDuplicates: ["G->H"],
    expectInvalids: ["hello", "1->2", "A->"]
  },
  {
    name: "CASE 8 STRESS",
    data: Array.from({length: 100}, (_, i) => `${String.fromCharCode(65 + (i%26))}->${String.fromCharCode(65 + ((i+1)%26))}`),
    // This creates a massive cycle of all 26 letters, plus lots of duplicates.
    expectCycles: 1,
    expectTrees: 0
  },
  {
    name: "CASE 9 ADVANCED DISCONNECTED CYCLES",
    data: ["A->B", "B->C", "C->A", "X->Y", "Y->Z", "Z->X"],
    expectTrees: 0,
    expectCycles: 2
  },
  {
    name: "CASE 10 ADVANCED MULTI PARENT DISCARDING",
    data: ["B->C", "C->D", "D->B", "A->B"],
    // B->C, C->D, D->B forms a cycle.
    // A->B is encountered. But B already has parent D!
    // So A->B is discarded.
    // The cycle B-C-D is preserved. A is ignored.
    expectCycles: 1,
    expectTrees: 0
  }
];

let failed = 0;

for (const t of tests) {
  console.log(`\n--- Running ${t.name} ---`);
  const res = processData(t.data);
  
  let ok = true;
  if (t.expectTrees !== undefined && res.summary.total_trees !== t.expectTrees) {
    console.error(`❌ Expected ${t.expectTrees} trees, got ${res.summary.total_trees}`);
    ok = false;
  }
  if (t.expectCycles !== undefined && res.summary.total_cycles !== t.expectCycles) {
    console.error(`❌ Expected ${t.expectCycles} cycles, got ${res.summary.total_cycles}`);
    ok = false;
  }
  if (t.expectDuplicates && res.duplicateEdges.length !== t.expectDuplicates.length) {
    console.error(`❌ Expected ${t.expectDuplicates.length} duplicates, got ${res.duplicateEdges.length}`);
    ok = false;
  }
  if (t.expectInvalids && res.invalidEntries.length !== t.expectInvalids.length) {
    console.error(`❌ Expected ${t.expectInvalids.length} invalids, got ${res.invalidEntries.length}`);
    ok = false;
  }
  
  if (ok) {
    console.log(`✅ Passed.`);
  } else {
    failed++;
    console.log("Got Output:", JSON.stringify(res, null, 2));
  }
}

if (failed === 0) {
  console.log("\n🚀 ALL TESTS PASSED!");
} else {
  console.log(`\n⚠️ ${failed} TESTS FAILED.`);
}
