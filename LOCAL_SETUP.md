# ORCA Local Setup & Execution Guide
**Indradhanu Hackathon 2026: AI for Greener Tomorrow**  
*Marine Ecosystem Reasoning with Collaborative Autonomous Agents*

---

## 1. System Requirements & Architecture Overview

ORCA runs locally with a decoupled dual-tier architecture:
- **Backend**: Python 3.10+ (tested on Python 3.14.5), FastAPI, Uvicorn, Pydantic v2, NumPy, PIL.
- **Frontend**: Node.js 20.18+, React 19, TypeScript, Vite 8+, Tailwind CSS, Leaflet.

Both tiers run on standard localhost ports:
- **Backend API**: `http://127.0.0.1:8000` (Swagger docs: `http://127.0.0.1:8000/docs`)
- **Frontend UI**: `http://127.0.0.1:5173`

---

## 2. Prerequisites Installation

### Python
Ensure Python 3.10 or newer is installed:
```powershell
python --version
```

### Node.js & npm
Ensure Node.js 20.18+ and npm are installed:
```powershell
node --version
npm --version
```

---

## 3. Backend Setup

### Step 3.1: Navigate to Backend Directory
```powershell
cd "c:\Users\ATHARV\OneDrive\Desktop\ORCA FINAL PROTOTYPE\backend"
```

### Step 3.2: Create and Activate Virtual Environment (Recommended)
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Step 3.3: Install Python Dependencies
```powershell
pip install -r requirements.txt
```

### Step 3.4: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
> [!NOTE]
> All external services (Copernicus CDSE, Copernicus Marine, AIS, Nugen, IoT) have **safe, functional offline/demo modes** out-of-the-box. No mandatory paid API keys or credit cards are needed to run, test, and demonstrate the full system.

### Step 3.5: Run Backend Tests to Verify Setup
```powershell
pytest -v
```
All 131 test cases across 8 test suites will pass.

### Step 3.6: Launch FastAPI Backend Server
```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
You should see:
```text
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

Verify backend health in another terminal or browser:
- Health Check: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
- Interactive API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 4. Frontend Setup

### Step 4.1: Open a Second Terminal and Navigate to Frontend
```powershell
cd "c:\Users\ATHARV\OneDrive\Desktop\ORCA FINAL PROTOTYPE\frontend"
```

### Step 4.2: Install NPM Packages
```powershell
npm install
```

### Step 4.3: Configure Frontend Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Ensure `VITE_API_BASE_URL` points to your backend:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Step 4.4: Verify Production Build
```powershell
npm run build
```
Builds cleanly with zero TypeScript errors into `dist/`.

### Step 4.5: Launch Vite Development Server
```powershell
npm run dev -- --host 127.0.0.1
```
Open your browser at:
- **ORCA Command Center**: [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## 5. Dual-Terminal Startup Quick Reference

| Terminal | Working Directory | Command | URL |
| :--- | :--- | :--- | :--- |
| **Terminal 1: Backend** | `backend/` | `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload` | `http://127.0.0.1:8000` |
| **Terminal 2: Frontend** | `frontend/` | `npm run dev -- --host 127.0.0.1` | `http://127.0.0.1:5173` |

---

## 6. Troubleshooting & Diagnostics

### Issue: Port 8000 already in use
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
```

### Issue: Port 5173 already in use
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
```

### Issue: Backend CORS errors in browser console
Ensure `app/core/config.py` allows origins:
```python
BACKEND_CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
```
This is configured by default.
