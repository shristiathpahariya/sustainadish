# Quick Start: AI Recipe Modification

## 🚀 Get Started in 3 Steps

### Step 1: Get Your Free API Key (2 minutes)

1. Go to **[Google AI Studio](https://makersuite.google.com/app/apikey)**
2. Sign in with your Google account
3. Click **"Create API key"**
4. **Copy** your API key (starts with `AIza...`)

### Step 2: Add API Key to Backend (1 minute)

Create or edit `Backend/.env` file:

```bash
GEMINI_API_KEY=AIzaSy...paste-your-key-here
```

### Step 3: Restart Backend (30 seconds)

```bash
# Stop current backend (Ctrl+C)
cd Backend
python app.py
```

Look for this message:
```
✅ Google Gemini API initialized successfully
```

---

## 🎯 Try It Out

1. Open your app
2. Enter some ingredients to get a recipe
3. Click "View full recipe"
4. Look for **"🤖 Customize this recipe"** at the bottom
5. Try these:
   - Click **"🌶️ Spicier"** button
   - Type: "Make it vegetarian"
   - Type: "Swap butter for olive oil"

---

## 📋 What's New

### ✨ For Users
- **4 Quick Action Buttons**: Vegetarian, Gluten-free, Spicier, Healthier
- **Natural Language**: Type anything like "Make it dairy-free"
- **See Changes**: New ingredients are highlighted in green
- **Chat History**: See the conversation as you modify
- **Reset Anytime**: Go back to original recipe

### 🔧 For Developers
- New endpoint: `/ai-modify-recipe`
- Conversation memory (remembers previous changes)
- Smart validation (won't destroy recipe structure)
- Free: 1,500 requests/day

---

## 🆘 Troubleshooting

### "AI service not available" error
➡️ Make sure you added `GEMINI_API_KEY` to `.env`
➡️ Restart the backend server

### "API key not found" in logs
➡️ Check `.env` file name (no `.env.example` suffix)
➡️ Verify key was pasted correctly

### Modifications not working
➡️ Check backend has internet connection
➡️ Verify API key is valid at Google AI Studio

---

## 📊 Free Limits (Don't Worry!)

Google Gemini API (Free):
- ✅ 15 requests per minute
- ✅ 1,500 requests per day
- ✅ ~100+ recipe modifications per day

This is perfect for:
- Personal projects (unlimited)
- Small businesses
- Beta testing

---

## 📚 Documentation

- **Setup Guide**: `Backend/AI_SETUP.md`
- **Implementation Details**: `AI_FEATURE_IMPLEMENTATION.md`
- **Code Changes**: See commit history

---

## 🎨 UI Preview

```
┌─────────────────────────────────────┐
│ Recipe: Pasta Primavera             │
│ [✨ Modified with AI]               │
│                                     │
│ Ingredients (Updated):              │
│ • 2 cups pasta                      │
│ • 1 cup bell peppers [NEW]          │
│ • 1/2 cup red pepper flakes [NEW]   │
│                                     │
┌─────────────────────────────────────┐
│ 🤖 Customize this recipe           │
│                                     │
│ [🥬 Veg] [🌾 GF] [🌶️ Spicy] [💪]   │
│                                     │
│ Chat:                               │
│ You: Make it spicier                │
│ AI: Added red pepper flakes...      │
│     Changes: Made it spicier        │
│                                     │
│ [ Make it spicier          [Send] ] │
└─────────────────────────────────────┘
```

---

## 🚀 You're Ready!

The feature is now live. Users can:
- Modify recipes with natural language
- See what changed
- Keep modifying until perfect
- Reset to original if needed

**Enjoy! 🎉**