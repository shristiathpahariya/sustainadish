# SustainaDish - Vercel Deployment Guide

## Overview
This guide explains how to deploy the SustainaDish application using the recommended approach:
- **Frontend**: Vercel
- **Backend API**: Render (Node.js/Express)
- **ML Service**: Render (Python/Flask)
- **Database**: MongoDB Atlas (already cloud-hosted)

## Prerequisites
- GitHub account with your code pushed to a repository
- Vercel account (free tier available)
- Render account (free tier available for development)
- MongoDB Atlas account (already configured)

## Step 1: Set Up Environment Variables

### Frontend Environment Variables (Vercel)
Create `.env.production` in the root directory:
```bash
# Replace these URLs with your actual deployed service URLs
VITE_API_URL=https://your-backend-url.vercel.app/api
VITE_ML_API_URL=https://your-ml-service.onrender.com
```

### Backend Environment Variables (Render)
Create `.env` in the `Backend` directory:
```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=sustainadish
JWT_SECRET=<your-secure-jwt-secret>
PORT=3000
NODE_ENV=production
```

## Step 2: Generate Secure JWT Secret

Generate a secure JWT secret before deployment:

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3: Deploy Frontend to Vercel

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import project in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure settings:
     - Framework Preset: Vite
     - Root Directory: `./`
     - Build Command: `npm run build`
     - Output Directory: `dist`

3. **Add Environment Variables in Vercel**
   ```
   VITE_API_URL=https://your-backend-url.vercel.app/api
   VITE_ML_API_URL=https://your-ml-service.onrender.com
   ```
   (You'll get the actual URLs after deploying the backend and ML service)

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Copy the provided Vercel URL

## Step 4: Deploy Backend to Render

1. **Create a separate GitHub repository** for the backend or ensure your backend is properly structured

2. **Connect to Render**
   - Go to [render.com](https://render.com)
   - Click "New +"
   - Select "Web Service"

3. **Configure deployment**
   - **Repository**: Select your backend repository
   - **Root Directory**: `Backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment Variables**:
     ```
     MONGODB_URI=your_mongo_connection_string
     JWT_SECRET=your_secure_jwt_secret
     PORT=3000
     NODE_ENV=production
     ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Copy the provided Render URL

## Step 5: Deploy ML Service to Render

1. **Create `requirements.txt`** (already created in Backend folder)
2. **Create `Procfile`** (already created in Backend folder)

3. **Connect ML service to Render**
   - Go to Render dashboard
   - Click "New +"
   - Select "Web Service"
   
4. **Configure deployment**
   - **Repository**: Select your repository
   - **Root Directory**: `Backend` (or move ml files to a separate directory)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
   - **Type**: Python 3

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Copy the provided Render URL

## Step 6: Update Frontend Configuration

1. **Update Vercel environment variables** with the actual URLs:
   ```
   VITE_API_URL=https://your-actual-backend-url.onrender.com/api
   VITE_ML_API_URL=https://your-actual-ml-service-url.onrender.com
   ```

2. **Redeploy frontend**
   - Go to your Vercel project dashboard
   - Make a small change or trigger a new deployment
   - Wait for deployment to complete

## Step 7: Update Local Development

### Frontend
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend
```bash
cd Backend
npm install
npm start
```

### ML Service
```bash
cd Backend
pip install -r requirements.txt
python app.py
```

## File Structure After Deployment

```
sustainadish/
├── .env.example              # Example environment variables
├── .env.development          # Development environment variables
├── .gitignore                # Updated to ignore sensitive files
├── package.json              # Updated with deployment dependencies
├── vercel.json               # Vercel configuration
├── Backend/
│   ├── .env.example          # Backend environment variables example
│   ├── server.js             # Updated to use environment variables
│   ├── routes/
│   │   └── auth.js           # Updated to use JWT_SECRET from env
│   ├── middleware/
│   │   └── authMiddleware.js # Updated to use JWT_SECRET from env
│   ├── app.py                # Flask ML service
│   ├── requirements.txt      # Python dependencies
│   ├── Procfile              # Render deployment config
│   └── package.json          # Backend-specific package.json
└── src/
    ├── config.js             # API URL configuration
    └── components/           # All components updated to use config URLs
```

## Important Notes

### Port Configuration
- **Development**: 
  - Frontend: Vite dev server (usually port 5173)
  - Backend: 3000
  - ML Service: 5000

- **Production**:
  - All services use their deployment platform's assigned ports
  - URLs are handled by the deployment platforms

### Security
- Never commit `.env` files to Git
- Use strong JWT secrets (minimum 32 characters)
- Rotate secrets regularly
- Use environment-specific configurations

### Deployment URLs
After successful deployment, your URLs will look like:
- Frontend: `https://your-project.vercel.app`
- Backend: `https://your-backend.onrender.com`
- ML Service: `https://your-ml-service.onrender.com`

### Troubleshooting

**Issue: API calls failing**
- Check environment variables are set correctly
- Verify CORS settings
- Check network tab in browser for error messages

**Issue: ML service not responding**
- Ensure all pickle files are uploaded
- Check Python dependencies in requirements.txt
- Verify app.py is starting correctly

**Issue: Build errors**
- Check package.json dependencies
- Verify Vite configuration
- Review build logs in deployment dashboard

## Next Steps

1. Deploy each service to its platform
2. Update environment variables with actual deployed URLs
3. Test the complete application end-to-end
4. Set up monitoring and error tracking
5. Configure custom domains (if needed)
6. Set up CI/CD pipeline for automated deployments

## Alternative Deployment Options

If you prefer a simpler approach, consider deploying everything on `Render`:
- Frontend as a static site
- Backend as a Node.js service
- ML service as a Python service

This keeps everything in one platform with unified management.