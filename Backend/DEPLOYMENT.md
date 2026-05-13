# Backend Deployment Guide

## Build Preparation

The backend includes a build preparation script that ensures necessary directories and files exist before deployment.

### Build Script

Run this during the build phase:

```bash
npm run build:prepare
```

This script:
- Creates required directories (`exports`, `input`, `ml_versions`)
- Ensures a sample `exports/data.csv` exists (for initial builds)
- Checks for required ML model files
- Provides clear warnings if files are missing

### Required Files

The app expects these files to exist in the `input/` directory:

- `combined_embeddings.pkl` - Pre-computed embeddings
- `tfidf_vectorizer.pkl` - Trained TF-IDF vectorizer
- `sampled_data.pkl` - Trained dataset
- `sampled_data.json` - Fallback dataset

### On First Deployment

1. The build script creates a minimal sample `exports/data.csv`
2. The app will start even if ML models are missing (they'll load gracefully)
3. ML-based endpoints (`/recommend`, `/ingredients/suggest`) will return appropriate errors
4. Run `npm run retrain:model` to train the full model with your recipe database

### Environment Variables

Ensure these are set in your deployment environment:

```
# Required
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=your-gemini-api-key

# Optional
RETRAIN_SCHEDULER_ENABLED=true
RETRAIN_INTERVAL_HOURS=6
RETRAIN_BUMP=patch
RETRAIN_MAX_FEATURES=2000
FRONTEND_URL=https://your-frontend-url.com
```

## Python 3.13 Compatibility

The backend is now fully compatible with Python 3.13. See `PYTHON_313_MIGRATION.md` for details on package updates and API changes.

## Render Deployment

### Startup Command

For Render, use this startup command (in the Render dashboard):

```bash
cd Backend && npm start
```

This will:
1. Start the Express server (`server.js`)
2. Launch the Flask app for ML features (`app.py`)
3. Run the scheduled retraining (if enabled)

### Build Command

For the build phase:

```bash
cd Backend && npm run build:prepare
```

This ensures directories exist before deployment.

### Important Notes

1. **ML Models**: ML models should be trained and committed to the repo or trained during the first deployment
2. **Python Version**: Render uses Python 3.11 by default - ensure your build settings match
3. **Node Version**: Node 18+ is required (specified in `package.json`)
4. **Dependencies**: All Python dependencies are listed in `requirements.txt`

## Troubleshooting

### FileNotFoundError: exports/data.csv

If you see this error during builds:

1. Run `npm run build:prepare` locally
2. Commit the generated `exports/data.csv` file
3. Redeploy

The build script creates this file automatically, but it needs to be committed to the repo for deployments.

### ML Model Not Loaded

If ML features don't work:

1. Check if model files exist in `Backend/input/`
2. Run `npm run retrain:model` to train the model
3. Ensure MongoDB is connected and has approved recipes

### Python 3.13 Import Errors

If you get import errors:

1. Ensure you're using the updated `requirements.txt`
2. The new SDK is `google-genai` not `google-generativeai`
3. See `PYTHON_313_MIGRATION.md` for detailed migration steps

## Development Setup

### Local Development

```bash
cd Backend
npm install
pip install -r requirements.txt
npm run build:prepare  # Ensure directories exist
npm start             # Start both Express and Flask servers
```

### Training the Model

```bash
cd Backend
npm run retrain:model -- --limit 10000 --activate true --maxFeatures 2000
```

### Testing Endpoints

```bash
# Health check
curl http://localhost:5000/health

# Recipe recommendation (requires trained model)
curl -X POST http://localhost:5000/recommend -F "ingredients=tomato,onion"

# Ingredient suggestions
curl http://localhost:5000/ingredients/suggest?q=tom
```

## Production Checklist

Before deploying to production:

- [ ] All environment variables are set
- [ ] MongoDB connection is working
- [ ] GEMINI_API_KEY is valid and has quota
- [ ] ML model files exist in `Backend/input/`
- [ ] `exports/data.csv` exists (created by build script)
- [ ] Node version is 18+
- [ ] Python version matches requirements.txt (3.11-3.13)
- [ ] Database migrations have been run (`npm run migrate`)
- [ ] Redis/cache configured (if needed)