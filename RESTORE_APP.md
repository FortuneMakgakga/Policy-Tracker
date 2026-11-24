# Restore app.py + fix CORS

If `app.py` was truncated, run this in the **backend** Codespace (`the-_great_Unifier` branch):

```bash
git fetch origin
git checkout 58f2097fe42c46f1a1e11d14d94fe9c36637c0be -- app.py
python3 fix_cors.py
# then restart Flask / the Codespace app
```

### What the CORS fix does

- Allows origins matching `https://*.app.github.dev` and `localhost`
- Sets `supports_credentials=True` with **explicit** origins (required; `*` is illegal with cookies)
- Sets `SESSION_COOKIE_SAMESITE=None` + `SECURE=True` so the session cookie is sent cross-origin between two Codespace hosts

Frontend `VITE_API_BASE` should be your backend public URL, e.g.
`https://opulent-happiness-7xvg5xp75vq3p95r-5000.app.github.dev`
