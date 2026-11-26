# Heart Lantern 心燈 — Full-Stack Web App

## Run Locally
1. Install Node.js (v18 or newer).
2. Open a terminal inside this folder and run:
   ```bash
   npm install
   npm start
   ```
3. Open `http://localhost:3000` in your browser.

## Deploy Live to the Web (Render / Railway)
1. Push this folder to a GitHub repository.
2. Create a new **Web Service** on [Render](https://render.com) or [Railway](https://railway.app) connected to that repo.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. *(Optional)* Mount a persistent disk to `/app/data` and set environment variable `DATA_DIR=/app/data` so database records persist across server restarts.
