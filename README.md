# Tree Hierarchy Analyzer

A full-stack tool that takes a list of parent→child node relationships and processes them into structured trees. Built for a college hackathon.

---

## What it does

You give it a list like `A->B, A->C, B->D` and it:

- Validates every entry (checks format, rejects self-loops, empty sides, lowercase, digits, etc.)
- Deduplicates repeated edges
- Detects cycles using DFS
- Builds a recursive nested tree for each valid root
- Calculates tree depth
- Returns a clean summary of how many trees vs cycles were found

The frontend lets you type or paste edges, hit Analyze, and see the results laid out as collapsible tree cards with cycle warnings, invalid entry chips, and a summary bar.

---

## Project structure

```
/backend
  index.js       Express server, all processing logic
  package.json

/frontend
  index.html     Single page app
  style.css
  app.js
```

---

## Running locally

**Backend**

```bash
cd backend
npm install
npm start
```

Starts at `http://localhost:3000`.

**Frontend**

Open a second terminal:

```bash
cd frontend
npx serve . -l 5000
```

Then open `http://localhost:5000` in your browser.

Make sure `API_BASE` in `frontend/app.js` is set to `http://localhost:3000` for local dev.

---

## API

**POST** `/bfhl`

```
Content-Type: application/json
```

Request body:

```json
{
  "data": ["A->B", "A->C", "B->D", "X->Y", "Y->Z", "Z->X"]
}
```

Response:

```json
{
  "user_id": "name_ddmmyyyy",
  "email_id": "email@college.edu",
  "college_roll_number": "ROLLNUMBER",
  "hierarchies": [
    { "root": "A", "tree": { "A": { "B": {}, "C": {} } }, "depth": 2 },
    { "root": "X", "tree": {}, "has_cycle": true }
  ],
  "invalid_entries": [],
  "duplicate_edges": [],
  "summary": {
    "total_trees": 1,
    "total_cycles": 1,
    "largest_tree_root": "A"
  }
}
```

Health check: `GET /` returns `{ "status": "ok" }`.

---

## Validation rules

An edge is valid only if:

- It contains exactly one `->` separator
- Both sides are a single uppercase letter A–Z
- It is not a self-loop like `A->A`

Anything else goes into `invalid_entries`. Repeated valid edges after the first occurrence go into `duplicate_edges` (each repeated pair listed only once regardless of how many repeats there are).

---

## Cycle detection

Runs a DFS with a recursion stack on the directed edges per connected component. If a cycle is detected, the whole component is reported as a cycle group with `has_cycle: true` and no `depth` field.

Multi-parent edges (diamond shapes) are handled by silently dropping any edge that would give a node a second parent — first-seen wins.

---

## Deploying

**Backend on Render:**

1. Push the `/backend` folder to GitHub.
2. Create a new Web Service on Render, point it at the repo.
3. Set Start Command to `node index.js`.
4. Copy the service URL (e.g. `https://xyz.onrender.com`).

**Frontend on Netlify:**

1. Update `API_BASE` in `app.js` to your Render URL.
2. Drag and drop the `/frontend` folder into Netlify's deploy UI.

The evaluator will POST to `<your-backend-url>/bfhl` — make sure you submit only the base URL, not the full path.

---

## Notes

- CORS is enabled for all origins via the `cors` npm package.
- The backend responds in well under 3 seconds for inputs up to 50 nodes.
- No hardcoded responses — everything is computed from the input.
