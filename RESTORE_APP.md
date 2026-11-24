# Fix CORS (backend Codespace)

Your frontend and backend run on **different** `*.app.github.dev` hosts, so the browser requires CORS + cross-site cookies.

## 1. Restore app.py if it says PLACEHOLDER

In the **backend** Codespace (branch `the-_great_Unifier`):

```bash
git fetch origin
git checkout 58f2097fe42c46f1a1e11d14d94fe9c36637c0be -- app.py
```

## 2. Apply the CORS patch

```bash
python3 fix_cors.py
```

## 3. Restart Flask

Stop and start the backend again so the new settings load.

## 4. Frontend env

In the frontend Codespace, `.env` should have:

```
VITE_API_BASE=https://opulent-happiness-7xvg5xp75vq3p95r-5000.app.github.dev
```

(no trailing slash). Restart Vite after changing it.

### Why this broke

`CORS(app, supports_credentials=True)` without explicit origins does not send `Access-Control-Allow-Origin` for cross-origin preflight. Browsers also reject `*` when `credentials: 'include'` is used. Session cookies across two Codespace hosts need `SameSite=None; Secure`.
