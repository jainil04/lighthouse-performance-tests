Review the current branch changes as a senior full-stack engineer would before a portfolio project interview. Be direct — flag real issues, don't pad.

## Run this review

**1. Get the diff**
```bash
git diff main...HEAD
git log main...HEAD --oneline
```

**2. Check each category below. Report: PASS / FAIL / N/A with a one-line note.**

---

### API / Backend

- [ ] **SSE parity**: if `api/lighthouse.js` was changed, does `backend/services/lighthouseService.js` reflect the same change?
- [ ] **SSE event schema**: are all emitted events using the correct types (`start`, `progress`, `run-complete`, `complete`, `error`)? No extra invented types?
- [ ] **Browser cleanup**: any new Puppeteer usage has `browser.close()` in a `finally` block?
- [ ] **vercel.json**: new `api/*.js` files have a matching route entry?
- [ ] **Locale env vars**: any new file that calls `lighthouse()` sets `process.env.LC_ALL` etc. at module level?
- [ ] **No CommonJS**: no `require()`, no `module.exports`?
- [ ] **Monotonic progress**: no SSE event sends a lower progress value than a prior one?

### Vue / Frontend

- [ ] **Script setup only**: no Options API, no `defineComponent`, no `this`?
- [ ] **Layer discipline**: `common/` components use props only (no inject, no composable imports)?
- [ ] **No raw GSAP**: no `gsap.to()` / `gsap.from()` calls outside `animationUtils.js`?
- [ ] **Score thresholds consistent**: green ≥ 90, yellow ≥ 50, red < 50 — no drift?
- [ ] **Props naming**: camelCase in `defineProps`, kebab-case in parent template?
- [ ] **New global state**: any new shared state added to `App.vue` + `provide()` rather than a new store?
- [ ] **fullReport guard**: any code reading `fullReport` guards for null (`if (fullReport.value)`)?

### General

- [ ] **No dead imports**: no imports of deleted files or functions that don't exist?
- [ ] **No console.log left in hot paths**: audit streaming logs are acceptable; UI render logs are not?
- [ ] **No test files scaffolded**: no `.spec.js` / `.test.js` files added?
- [ ] **No new deps without reason**: `package.json` changes justified?

---

**3. Summary**

State: overall PASS or FAIL, list the specific failures with file:line, and suggest the fix for each.

Interview angle: flag anything that would generate a question in a senior engineering interview — e.g. "why did you skip error handling here?", "this creates a memory leak under X condition", "this pattern doesn't scale when Y is added."
