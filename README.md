# StockPilot — Stock Inventory Management System

A MERN monorepo for branch-aware inventory control. The UI uses React/Vite, Tailwind CSS, React Router, Axios, Recharts and Lucide React. The API uses Express, Mongoose, Joi, HttpOnly JWT cookies, Socket.IO and MongoDB.

## Included capabilities

- Separate Category schema with branch-aware category management endpoints.
- Admin, Manager and Store Staff roles; the server reloads the active account for each authenticated request so deactivation/role changes take effect without waiting for a token to expire.
- Branch-scoped inventory and requisitions; admins can oversee all branches.
- Item catalog, stock ledger, receipts/issues/adjustments, requisition submission and manager review, account creation/deactivation, audit trail, stockout heuristics, expiry watchlist endpoint and data-backed 14-day movement chart.
- MongoDB session transaction around stock mutation, movement record and audit log. This requires MongoDB Atlas or another replica-set/sharded deployment; a standalone local MongoDB server does not support multi-document transactions.
- FEFO batch issue allocation: expired batches are excluded and eligible batches are consumed in earliest-expiry order. Batch-tracked receipts require a batch number; expiry date is accepted for new batches. Direct total adjustments are intentionally disabled for batch-tracked items.
- Socket.IO events for requisition changes; sockets authenticate with the HttpOnly session cookie and join only their assigned branch room (admins can also join the global admin room).
- Helmet, CORS allow-list, request size limits, login rate limiting, Joi request validation, duplicate-key handling, secure cookie option and environment-secret validation.
- Automated unit tests for FEFO and the role permission matrix.

## Prerequisites

- Node.js 20 LTS or newer and npm
- MongoDB Atlas (recommended) or a MongoDB replica set
- Git

## Local setup (Windows PowerShell)

Open two VS Code terminals from the extracted project root.

### 1. Configure and start the backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edit `backend/.env`:

```dotenv
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://DB_USER:URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/stock_inventory?retryWrites=true&w=majority
JWT_SECRET=PASTE_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
JWT_EXPIRES_IN=8h
CLIENT_URL=http://localhost:5173
COOKIE_SECURE=false
TRUST_PROXY=false
ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Use_A_Unique_Password_123!
ADMIN_BRANCH_ID=HQ
```

Generate a secret in PowerShell if needed:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

URL-encode special characters in the MongoDB username/password. In Atlas, create a database user and allow your current development IP in Network Access. Never commit `.env`.

```powershell
npm run seed:admin
npm run dev
```

API health check: `http://localhost:5000/api/health`.

### 2. Start the frontend

In the second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`. Sign in using the admin email/password configured in `backend/.env`. Use Admin → User accounts to create Manager and Store Staff accounts. The frontend calls `http://localhost:5000/api` by default and includes credentials for cookie authentication.

### 3. Tests and production build

```powershell
# From backend
npm test
npm run check

# From frontend
npm run build
```

`npm test` runs the built-in Node test runner. It covers FEFO ordering/expiry exclusion and core role permission rules. The API authorization/branch-isolation integration suite is skipped unless `MONGO_URI_TEST` is set to a disposable MongoDB database whose name ends in `_test` (for example `stock_inventory_test`). In PowerShell, set `$env:MONGO_URI_TEST='mongodb+srv://.../stock_inventory_test?retryWrites=true&w=majority'` before `npm test`. That suite creates and removes only its `stockpilot-test-*` users and `TEST-*` items. Do not point it at production data. Run the integration suite against a disposable test database before release.

## Important stock semantics

- Incoming stock to a batch-tracked item requires `batchNumber`; `expiryDate` may be supplied for a new batch. Existing batch expiry dates cannot be silently changed by receiving more units.
- Outgoing stock uses FEFO, excluding expired batches. It rejects the issue if valid batches cannot cover the full quantity.
- For items created with opening batches, the item opening quantity must equal the sum of batch quantities.
- For non-batch items, incoming/outgoing movements update the aggregate quantity. An adjustment sets the aggregate on-hand quantity and is restricted to Admin/Manager. Adjustments of batch-tracked items are disabled to avoid silently corrupting batch balances.
- Stock movement + stock record + audit event use one MongoDB transaction. Ensure Atlas/replica-set transaction support is enabled.
- Forecasts are transparent heuristics: 30-day outbound average, current quantity, reorder point and reorder horizon. They are not statistical/ML guarantees.

## Production deployment checklist

1. Deploy the backend to a Node host (Render, Railway, Fly.io, or your own server) and frontend to a static host (Vercel/Netlify or Nginx). Configure environment variables in the hosting dashboard, not in source control.
2. Set `NODE_ENV=production`, `COOKIE_SECURE=true`, `TRUST_PROXY=true` when behind a trusted TLS-terminating proxy, and set `CLIENT_URL` to the exact HTTPS frontend origin. Use a strong unique `JWT_SECRET`; rotate it if exposed.
3. Deploy frontend with `VITE_API_URL=https://YOUR_API_HOST/api`. If frontend/API are on different sites, review browser third-party-cookie policies and configure same-site/cookie domain strategy deliberately; prefer same-site subdomains and HTTPS.
4. Use a dedicated MongoDB production database, least-privilege DB credentials, IP restrictions/private networking where possible, and automated backups with tested restore drills.
5. Set up host monitoring, uptime checks for `/api/health`, centralized logs, error alerts, database capacity alerts, and a retention policy for audit data. Do not log credentials, cookies, JWTs, or full secrets.
6. Run `npm test`, backend syntax checks, frontend production build, and a role/branch acceptance suite against staging before releasing.
7. Use a process manager/platform health checks and graceful shutdown for the API. Apply database migrations/index changes during controlled deployment windows.

## GitHub: push this project

Create an empty repository on GitHub (do not initialize it with a README if you already have this one). From the project root:

```powershell
git init
git add .
git commit -m "Build StockPilot inventory management system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your repository URL. If `git remote add origin` says it already exists, run `git remote -v` and use `git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git`. GitHub authentication may require Git Credential Manager or a personal access token; never paste a token into source code.

Before pushing, verify `backend/.env` and `frontend/.env` are not tracked. The root `.gitignore` excludes environment files, `node_modules`, build output, logs and local coverage.

## API overview

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/POST /api/users`, `GET/PATCH /api/users/:id` (Admin)
- `GET/POST /api/categories`, `PATCH /api/categories/:id`
- `GET/POST /api/items`, `PATCH/DELETE /api/items/:id`
- `GET/POST /api/movements`
- `GET/POST /api/requisitions`, `PATCH /api/requisitions/:id/decision`
- `GET /api/reports/summary`, `GET /api/reports/movement-trend`, `GET /api/reports/expiring-batches`
- `GET /api/audit`, `GET /api/health`

All protected endpoints require the session cookie and enforce server-side role/branch restrictions. Frontend navigation visibility is for usability only; it is not the security boundary.
