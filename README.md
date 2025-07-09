# PAAS

Birdflop service for free educational server usage. Called PaaS for no particular reason, started as Python-as-a-Service but now it's just kind of everything. Like Google Colab but way more basic.

## Development

- Make sure you have a `.env` file in the `backend` folder

### Frontend

- `cd frontend`
- `pnpm i` to install dependencies
- `pnpm dev`

### Backend

- Make sure you have `Docker` installed and running.
- `python -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt` to setup and install dependencies
- `docker build -t paas:latest backend` to build the docker image
- `python -m backend` to run the backend