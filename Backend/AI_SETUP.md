# AI Recipe Modification Setup Guide

This guide explains how to set up Google Gemini API for the AI recipe customization feature.

## Overview

The AI recipe modification feature allows users to customize recipes through a chat-like interface. Users can ask for modifications like:
- "Make it vegetarian"
- "Make it spicier"
- "Swap butter for olive oil"
- "Reduce the fat"

The system uses Google Gemini API to generate intelligent recipe modifications while preserving the recipe's structure.

## Setup Instructions

### 1. Get Your Google Gemini API Key

1. Go to [AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API key"
4. Copy your API key (it starts with `AIza...`)

### 2. Add API Key to Environment

**For Development:**

Add to your `.env` file in the Backend directory:

```bash
GEMINI_API_KEY=AIzaSy...your-api-key-here
```

**For Production:**

Add `GEMINI_API_KEY` to your environment variables in your hosting platform (e.g., Render, Heroku, Vercel).

### 3. Install Python Dependencies

The backend already includes the necessary dependency. If you need to install it manually:

```bash
cd Backend
pip install google-generativeai==0.3.2
```

### 4. Restart the Backend Server

After adding the API key, restart your Flask backend:

```bash
# Kill the existing server (Ctrl+C or find and kill the process)
# Then start it again
python app.py
```

### 5. Verify Setup

When the backend starts, you should see:

```
Google Gemini API initialized successfully
```

If you see:

```
Warning: GEMINI_API_KEY not found. AI recipe modification will not be available.
```

This means the API key is missing or the environment variable wasn't loaded.

## Free Tier Limits

Google Gemini API offers generous free limits:

- **15 requests per minute**
- **1,500 requests per day**

This is sufficient for most personal and small business use cases. If you hit the limit, the system will show an error to users.

## How It Works

### Backend Flow:

1. User enters a modification request (e.g., "Make it spicier")
2. Frontend sends request to `/ai-modify-recipe` endpoint with:
   - Current recipe (ingredients, instructions)
   - Conversation history (previous modifications)
   - New request
3. Backend builds a context-aware prompt for Gemini
4. Gemini creates modified recipe following strict rules:
   - Keep recipe structure intact
   - Only change what was requested
   - Maintain cooking flow
   - Don't replace more than 30% of ingredients
5. Backend validates modification isn't too drastic
6. Returns updated recipe with summary of changes

### Frontend Flow:

1. Displays recipe ingredients and instructions
2. Shows AI chat section at bottom of modal
3. Displays quick action buttons for common requests
4. Shows conversation history as messages
5. Highlights new/modified ingredients
6. Allows reset to original recipe

## Customization

### Modify the AI Behavior

Edit the prompt in `Backend/app.py` to change how AI responds:

```python
prompt = f"""You are a recipe customization assistant.
# ... rest of prompt

You can add rules like:
- Always suggest healthier alternatives
- Add budget-friendly substitutions
- Include allergy warnings
"""
```

### Adjust Modification Limits

Change the 30% ingredient change threshold in `is_modification_too_drastic()`:

```python
if overlap_ratio < 0.7:  # Change 0.7 to allow more/less changes
    # ...
```

### Add Quick Action Buttons

In `src/components/RecipeRecommendation.jsx`, add more buttons:

```jsx
<button onClick={() => handleQuickAction("Make it dairy-free")}>
  🥛 Dairy-free
</button>
```

## Troubleshooting

### "AI service not available" Error

**Cause:** API key not set or backend not restarted after adding key.

**Solution:**
1. Check `GEMINI_API_KEY` is in your `.env` file
2. Restart the backend server
3. Check backend logs for initialization message

### Rate Limit Errors

**Cause:** Exceeded free tier limits (15 req/min or 1,500 req/day).

**Solution:**
1. Wait for rate limit to reset
2. Consider upgrading to paid tier for production
3. Implement caching for common requests

### "Modification too extensive" Error

**Cause:** User requested changes affecting >30% of ingredients.

**Solution:**
This is intentional behavior. The system suggests trying a different recipe instead of completely replacing the current one.

### "models/gemini-pro is not found" Error

**Cause:** Model name is incorrect or API version mismatch.

**Solution:**
1. Update the library version:
   ```bash
   pip install --upgrade google-generativeai
   ```

2. Check backend logs to see available models:
   ```
   Available Gemini models:
     - models/gemini-1.5-flash
     - models/gemini-pro
   ```

3. Update the model name in `Backend/app.py` line 394:
   ```python
   model = genai.GenerativeModel('models/gemini-pro')  # or the model you see in logs
   ```

4. Restart the backend service

### Library Too Old (0.3.2 → 0.8.3)

**Cause:** Old library version doesn't support current API.

**Solution:**
Update requirements.txt:
```
google-generativeai==0.8.3
```

Then reinstall:
```bash
cd Backend
pip install -r requirements.txt
```

### API Not Responding

**Cause:** Network issues or API downtime.

**Solution:**
1. Check internet connection
2. Verify API key is valid
3. Check [Google AI Status](https://status.cloud.google.com/)

## Security Best Practices

1. **Never commit API keys** to version control
2. Use environment variables for all secrets
3. Rotate API keys periodically
4. Monitor API usage with Google Cloud Console
5. Implement rate limiting on your backend

## Monitoring Usage

Monitor your API usage at [Google Cloud Console](https://console.cloud.google.com/):

1. Go to API & Services → Credentials
2. Find your Gemini API key
3. View usage statistics

## Alternative LLM Providers

If you want to use a different LLM provider, modify `Backend/app.py`:

### OpenAI GPT-3.5:

```python
import openai
client = openai.OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# Replace call_gemini_for_modification() with equivalent OpenAI call
```

### Groq:

```python
from groq import Groq
client = Groq(api_key=os.environ.get('GROQ_API_KEY'))
```

## Support

If you encounter issues:

1. Check backend logs for detailed error messages
2. Verify your API key is valid
3. Ensure you have internet connectivity
4. Review this guide for common solutions

## Feature Status

✅ Implemented:
- Natural language recipe modifications
- Conversation history and context
- Quick action buttons
- Visual change indicators
- Modification validation
- Reset to original recipe

🚧 Future Enhancements:
- Dietary preference memory
- Ingredient substitution suggestions
- Cost estimation for modifications
- Nutritional information updates