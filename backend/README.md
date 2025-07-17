# Lighthouse Performance Backend

Backend API service for running Lighthouse performance audits.

## Features

- 🚀 Express.js REST API
- 🔍 Lighthouse performance audits
- 🌐 CORS enabled for frontend integration
- 🛡️ Security middleware (Helmet)
- 📱 Mobile and Desktop testing
- 🌐 Network throttling simulation
- 📊 Multiple run averaging
- 🎯 Standard and Full audit views

## Installation

```bash
cd backend
npm install
```

## Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update the `.env` file with your configuration

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /health
```

### Lighthouse Status
```
GET /api/lighthouse/status
```

### Run Lighthouse Audit
```
POST /api/lighthouse/audit
```

#### Request Body
```json
{
  "url": "https://example.com",
  "device": "desktop",
  "throttle": "none",
  "runs": 1,
  "auditView": "standard"
}
```

#### Parameters
- `url` (required): URL to audit
- `device` (optional): "desktop" or "mobile" (default: "desktop")
- `throttle` (optional): "none", "3g", "4g", "slow", "fast" (default: "none")
- `runs` (optional): Number of runs 1-10 (default: 1)
- `auditView` (optional): "standard" or "full" (default: "standard")

#### Response
```json
{
  "success": true,
  "data": {
    "run": {
      "scores": {
        "performance": 95,
        "accessibility": 100,
        "bestPractices": 92,
        "seo": 100
      },
      "metrics": {
        "firstContentfulPaint": 1200,
        "largestContentfulPaint": 2400,
        "speedIndex": 1800,
        "totalBlockingTime": 150,
        "cumulativeLayoutShift": 0.1
      }
    }
  },
  "metadata": {
    "url": "https://example.com",
    "device": "desktop",
    "throttle": "none",
    "runs": 1,
    "auditView": "standard",
    "timestamp": "2025-01-16T..."
  }
}
```

## Docker Support (Optional)

### Build Image
```bash
docker build -t lighthouse-backend .
```

### Run Container
```bash
docker run -p 3001:3001 lighthouse-backend
```

## Development Notes

- Chrome is launched in headless mode automatically
- Multiple runs are averaged for more accurate results
- Standard view returns core metrics, Full view includes complete audit data
- Network throttling simulates real-world conditions
- CORS is configured for frontend at `http://localhost:5173`

## Dependencies

- **express**: Web framework
- **lighthouse**: Google's audit tool
- **chrome-launcher**: Chrome browser automation
- **cors**: Cross-origin resource sharing
- **helmet**: Security headers
- **compression**: Response compression
- **dotenv**: Environment configuration
