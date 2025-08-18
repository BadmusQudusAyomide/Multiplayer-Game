# Multiplayer Game (MVP)

Stack:
- Frontend: Next.js (App Router) + Tailwind + Zustand + socket.io-client
- Backend: Node.js + Express + Socket.IO + Mongoose (MongoDB Atlas)
- Hosting: Vercel (frontend), Railway (backend)

## Run locally

1. Copy envs
- `backend/.env` from `backend/.env.example` (set MONGODB_URI to your Atlas URI)
- `frontend/.env` from `frontend/.env.example`

2. Install deps
- Backend: `npm i` in `backend/`
- Frontend: `npm i` in `frontend/`

3. Start dev
- Backend: `npm run dev` (port 4000)
- Frontend: `npm run dev` (port 3000)

Or with Docker:
- In project root: `docker compose up --build`

## Next steps
- Implement auth routes in `backend/src/server.js`
- Add matchmaking + AI services, game loops, chat
- Wire frontend pages in `frontend/app/` to backend sockets and REST

## Deployment
- Railway: set envs (PORT, MONGODB_URI, JWT_SECRET, CORS_ORIGIN=https://<your-vercel-app>.vercel.app)
- Vercel: set NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_SOCKET_URL to Railway backend URL
