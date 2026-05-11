# Gym Tracker

Personal gym workout tracking PWA with progress history.

## Structure

```
fitness-tracking/
├── backend/    # Express + MongoDB API (deploy to Railway)
└── frontend/   # React + Vite PWA (deploy to Vercel)
```

## Local Development

### Backend

```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev            # starts on :3001
```

### Frontend

```bash
cd frontend
cp .env.example .env   # set VITE_API_URL=http://localhost:3001
npm install
npm run dev            # starts on :5173
```

## Environment Variables

### Backend (.env)
| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Min 32-char secret for access tokens |
| `JWT_REFRESH_SECRET` | Min 32-char secret for refresh tokens |
| `CLIENT_ORIGIN` | Frontend URL (for CORS) |
| `NODE_ENV` | `development` or `production` |

### Frontend (.env)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API URL |

## Deployment

### Backend → Railway
1. Create Railway project, add MongoDB plugin
2. Set all env vars from `.env.example`
3. Set `CLIENT_ORIGIN` to your Vercel domain
4. Deploy — Railway auto-detects `railway.toml`

### Frontend → Vercel
1. Import repo, set root to `frontend/`
2. Set `VITE_API_URL` to your Railway backend URL
3. Deploy — `vercel.json` handles SPA routing

## API Overview

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/workout-days` | List workout days |
| POST | `/api/workout-days` | Create day |
| PATCH | `/api/workout-days/:id` | Rename day |
| DELETE | `/api/workout-days/:id` | Delete day (cascades) |
| GET | `/api/workout-days/:dayId/exercises` | List exercises |
| POST | `/api/workout-days/:dayId/exercises` | Add exercise |
| PATCH | `/api/exercises/:id` | Update exercise (auto-logs history) |
| DELETE | `/api/exercises/:id` | Delete exercise |
| GET | `/api/progress/exercise/:id/chart` | Chart data |
| GET | `/api/progress/exercise/:id/history` | Full history |
| GET | `/api/progress/stagnant` | Stagnant exercises |
| GET | `/api/body-weight` | Body weight history |
| POST | `/api/body-weight` | Log weight |
