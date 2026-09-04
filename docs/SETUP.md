# Setup & Development Guide

## Prerequisites

- **Node.js**: 20+ (Download from [nodejs.org](https://nodejs.org))
- **Docker**: 20.10+ (Download from [docker.com](https://www.docker.com))
- **Docker Compose**: 2.0+ (usually bundled with Docker Desktop)
- **Git**: Latest version

## Project Structure

```
EventTicketBooking/
├── backend/          # Node.js + Express + TypeScript API
├── frontend/         # React + Vite + TypeScript UI
├── docs/             # Documentation
├── docker-compose.yml # Multi-container setup
└── README.md         # Project overview
```

## Option 1: Run with Docker (Recommended)

### Step 1: Setup Environment

```bash
cd EventTicketBooking

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
```

### Step 2: Start Services

```bash
# Start all services (MongoDB, Redis, Backend, Frontend)
docker compose up -d

# Watch logs
docker compose logs -f
```

### Step 3: Access Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### Step 4: Useful Commands

```bash
# Stop services
docker compose down

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild after code changes
docker compose up -d --build

# Remove all volumes (reset database)
docker compose down -v
```

## Option 2: Local Development (without Docker)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with local MongoDB and Redis
# MONGO_URI=mongodb://localhost:27017/event-ticketing
# REDIS_URL=redis://localhost:6379

# Ensure MongoDB and Redis are running locally
# MongoDB: mongod (default port 27017)
# Redis: redis-server (default port 6379)

# Start development server
npm run dev

# Server runs on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev

# Application runs on http://localhost:5173
```

## Building for Production

### Backend

```bash
cd backend
npm run build
npm start
# or run with Node directly
# node dist/index.js
```

### Frontend

```bash
cd frontend
npm run build
# dist/ folder contains optimized build
```

## Project Scripts

### Backend

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm run watch` | Watch TypeScript files for changes |
| `npm test` | Run tests (Phase 12) |

### Frontend

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run tests (Phase 12) |
| `npm run lint` | Run ESLint |

## Development Workflow

### Making Changes

1. **Backend changes**
   - Edit files in `backend/src/`
   - TypeScript auto-compiles with `npm run watch`
   - Or restart with `npm run dev` for full reload

2. **Frontend changes**
   - Edit files in `frontend/src/`
   - Vite hot reload applies changes instantly
   - No restart needed

### Testing Changes

```bash
# Build backend
cd backend && npm run build

# Run backend
npm start

# In another terminal, start frontend
cd frontend && npm run dev

# Visit http://localhost:5173
```

## Database

### MongoDB

**Local connection:**
```
mongodb://localhost:27017/event-ticketing
```

**Docker connection (from backend container):**
```
mongodb://mongo:27017/event-ticketing
```

**With authentication (docker-compose):**
```
mongodb://admin:password@mongo:27017/event-ticketing?authSource=admin
```

**Tools for viewing data:**
- MongoDB Compass GUI
- `mongosh` CLI (installed with MongoDB)

### Redis

**Local connection:**
```
redis://localhost:6379
```

**Docker connection (from backend container):**
```
redis://redis:6379
```

**CLI tool:**
```bash
# Open Redis CLI
redis-cli

# Common commands
KEYS *                    # List all keys
GET key                   # Get value
DEL key                   # Delete key
FLUSHALL                  # Clear all data
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :5000           # Backend
lsof -i :5173           # Frontend
lsof -i :27017          # MongoDB
lsof -i :6379           # Redis

# Kill process (use with caution)
kill -9 <PID>
```

### Docker Issues

```bash
# Rebuild images
docker compose build --no-cache

# Remove all containers and volumes
docker compose down -v

# Restart services
docker compose up -d
```

### Database Connection Issues

```bash
# Check if MongoDB is running
# Docker: docker ps | grep mongo
# Local: mongosh --eval "db.adminCommand('ping')"

# Check if Redis is running
# Docker: docker ps | grep redis
# Local: redis-cli ping
```

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear TypeScript build cache
rm -rf dist tsconfig.tsbuildinfo
npm run build
```

## Environment Variables

### Backend (backend/.env)

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGO_URI=mongodb://localhost:27017/event-ticketing

# Cache & Locking
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=dev_secret_change_in_production
JWT_REFRESH_SECRET=dev_refresh_change_in_production

# Payment (Phase 5)
PAYMENT_SECRET=dev_payment_secret
PAYMENT_WEBHOOK_SECRET=dev_webhook_secret
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Next Steps

1. **Phase 1** ✅ - Project setup complete
2. **Phase 2** - Start implementing authentication & RBAC
3. Continue through phases 3-14

See [README.md](../README.md) for complete project overview and [docs/](../) for detailed documentation.

## Additional Resources

- **Express.js Docs**: https://expressjs.com/
- **React Docs**: https://react.dev/
- **MongoDB Docs**: https://docs.mongodb.com/
- **Redis Docs**: https://redis.io/docs/
- **Socket.IO Docs**: https://socket.io/docs/v4/
- **Docker Docs**: https://docs.docker.com/

## Getting Help

1. Check error messages in console logs
2. Review documentation in `/docs`
3. Check existing GitHub issues
4. Consult framework documentation
