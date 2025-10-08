# Backend Setup Instructions

## MediaPipe Compatibility Issue

**IMPORTANT:** MediaPipe does not yet support Python 3.14. You have two options:

### Option 1: Downgrade to Python 3.11 (Recommended)
1. Install Python 3.11:
   ```bash
   brew install python@3.11
   ```

2. Recreate virtual environment with Python 3.11:
   ```bash
   cd backend
   rm -rf venv
   python3.11 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### Option 2: Use Mock Implementation (For Testing Only)
We can create a mock implementation that simulates MediaPipe functionality for testing purposes. This won't provide real pose detection but will allow you to test the API structure.

## Current Status

✅ Installed successfully:
- FastAPI, Uvicorn
- OpenCV
- NumPy, SciPy, scikit-learn
- Python-Jose, Passlib, Bcrypt
- Python-dotenv, aiofiles

❌ Not installed:
- MediaPipe (incompatible with Python 3.14)

## Next Steps

Once MediaPipe is installed:
1. Download a Stephen Curry shooting video
2. Start the server: `uvicorn main:app --reload`
3. Create the baseline: `POST /baseline/create` with the video file
4. Test analysis with user videos
