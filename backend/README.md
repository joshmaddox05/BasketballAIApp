# Basketball AI Analysis Backend

This FastAPI backend provides AI-powered shooting analysis for the Basketball AI App.

## Setup Instructions

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Installation

1. **Create a virtual environment:**
```bash
cd backend
python -m venv venv
```

2. **Activate the virtual environment:**

On macOS/Linux:
```bash
source venv/bin/activate
```

On Windows:
```bash
venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

### Running the Server

1. **Start the FastAPI server:**
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

2. **Access the API:**
- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### API Endpoints

#### Upload Video
```http
POST /upload/video
Content-Type: multipart/form-data

Body: video file
```

#### Analyze Shooting Form
```http
POST /analyze/shooting
Content-Type: application/json

{
  "video_id": "uuid",
  "analysis_mode": "shooting",
  "camera_type": "back",
  "duration": 5.0
}
```

#### Get Analysis Results
```http
GET /analysis/{video_id}
```

### Mobile App Integration

1. **Update AI Service Configuration:**
   In `src/services/aiAnalysisService.js`, set:
   ```javascript
   this.isOfflineMode = false;
   this.API_BASE_URL = 'http://YOUR_SERVER_IP:8000';
   ```

2. **Network Configuration:**
   Make sure your mobile device and server are on the same network, or deploy the server to a cloud platform.

### Production Deployment

For production deployment, consider:

1. **Cloud Platforms:**
   - AWS (EC2, Lambda, ECS)
   - Google Cloud Platform (Cloud Run, Compute Engine)
   - Azure (Container Instances, App Service)
   - Railway, Render, or DigitalOcean

2. **Database Integration:**
   - Replace in-memory storage with PostgreSQL, MongoDB, or Firebase
   - Add user authentication and data persistence

3. **ML Model Integration:**
   - Integrate TensorFlow, PyTorch, or MediaPipe for real pose detection
   - Add computer vision models for shooting form analysis
   - Implement video processing pipelines

4. **File Storage:**
   - Use cloud storage (AWS S3, Google Cloud Storage, Azure Blob)
   - Implement proper video compression and streaming

### Environment Variables

Create a `.env` file for production:
```
DATABASE_URL=postgresql://user:password@localhost/basketballai
SECRET_KEY=your-secret-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

### Development Notes

- The current implementation uses simulated AI analysis
- Replace the analysis logic with real ML models
- Add proper error handling and logging
- Implement rate limiting and authentication for production use
