# Chef Server (Express)

## Stack
- Express 5
- MongoDB driver 7
- Firebase Admin (token verification)

## Routes (high level)
- `/api/health` health check
- CRUD for users: `/api/users` and `/api/users/:id`
- Items: `/api/items` plus single/delete
- Root `/` responds with "Chef API is running"
- Favicon served from `public/favicon.svg` and `/favicon.ico`

## Env vars (examples)
- `PORT` (optional, default 5000)
- `MONGODB_URI` or `DB_USER`/`DB_PASS`/`MONGO_CLUSTER`
- `DB_NAME` (default `chef`)
- `CLIENT_URL` (CORS allowlist, comma-separated)
- `FIREBASE_SERVICE_KEY` (base64-encoded service account JSON)

## Local dev
```bash
npm install
npm start
# server at http://localhost:5000
```

## Deploy (Vercel)
- Root directory: `chef-server`
- The file exports `module.exports = app` for serverless
- Add env vars above in Vercel project settings
- Public assets (favicon) in `public/`

## Notes
- Mongo connection helper uses `DB_NAME`
- CORS origins derived from `CLIENT_URL`
- Token verification middleware: `verifyFireBaseToken`
