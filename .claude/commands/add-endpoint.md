Add a new API endpoint to both `/api/` (Vercel serverless) and `/backend/` (Express), maintaining parity between the two.

## Steps

**1. Clarify before writing**
- What is the endpoint path and HTTP method?
- Does it stream SSE or return a single JSON response?
- Does it need Lighthouse/Chrome, or is it a utility endpoint (like ai-summary)?

**2. Create `api/<name>.js`**

Use this skeleton:
```js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { } = req.body  // destructure expected fields

  try {
    // ...
    res.status(200).json({ ... })
  } catch (err) {
    console.error('<name> failed:', err)
    res.status(500).json({ error: err.message })
  }
}
```

If SSE: set headers first, use `res.write(`data: ${JSON.stringify(event)}\n\n`)`, always call `res.end()`.

**3. Add route to `vercel.json`**
```json
{ "src": "/api/<name>", "dest": "/api/<name>.js" }
```

**4. Mirror in `/backend/`**
- Add route handler in `backend/routes/lighthouse.js` (or a new routes file)
- Add business logic in `backend/services/` (new file if distinct from lighthouse)
- Register the new routes file in `backend/server.js` if it's a new file

**5. Call from frontend (if needed)**
- Add a function to `src/utils/lighthouseApi.js`
- If SSE: use `fetch()` + `response.body.getReader()` pattern (see `streamLighthouseAudit`)
- If JSON: use `fetch()` + `response.json()`

**6. Checklist before finishing**
- [ ] `api/<name>.js` handler exported as default
- [ ] Route added to `vercel.json`
- [ ] Same endpoint exists in `backend/` with identical SSE event schema or JSON shape
- [ ] Browser is closed in `finally` block if Lighthouse/Puppeteer is used
- [ ] Locale env vars set at module level if Lighthouse is used
- [ ] `req.method` guard at top of handler
