#!/bin/bash
# Start the full dev environment:
#   - Backend + DinD via Docker Compose (with hot reload)
#   - Frontend via native pnpm dev (fast HMR)

# Kill any existing native pnpm dev on :5173
EXISTING_PID=$(lsof -ti:5173 2>/dev/null)
if [ -n "$EXISTING_PID" ]; then
  echo "Killing existing process on port 5173 (PID $EXISTING_PID)..."
  kill $EXISTING_PID 2>/dev/null
  sleep 1
fi

# Stop any Docker frontend container from a previous docker compose up
docker compose stop frontend 2>/dev/null

trap 'kill $FRONTEND_PID 2>/dev/null; docker compose stop; exit' INT TERM

docker compose up --build -d --scale frontend=0

cd frontend
pnpm dev &
FRONTEND_PID=$!

echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:5555"
echo "Press Ctrl+C to stop everything."
echo ""

wait $FRONTEND_PID
