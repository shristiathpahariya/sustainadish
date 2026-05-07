# Import necessary libraries
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import pickle
import json
import re
from sklearn.metrics.pairwise import cosine_similarity
import gensim.models.keyedvectors as word2vec
import string
import nltk
from nltk.corpus import stopwords
from spellchecker import SpellChecker
import google.generativeai as genai
from typing import Dict, List, Tuple
from dotenv import load_dotenv
from datetime import datetime
import subprocess
import threading
import time

# Load environment variables from .env file
load_dotenv()

# Download necessary NLTK data
nltk.download('averaged_perceptron_tagger')
nltk.download('stopwords')
ENGLISH_STOP_WORDS = stopwords.words('english')
stemmer = nltk.stem.PorterStemmer()

# Initialize Flask app
app = Flask(__name__)
# Force production mode
app.config['DEBUG'] = False
app.config['TESTING'] = False
CORS(app)

# Initialize spellchecker
spell = SpellChecker()

# Initialize Google Gemini API
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
genai_initialized = False

# Debug: Check if API key is loaded
if GEMINI_API_KEY:
    print(f"[OK] GEMINI_API_KEY found (length: {len(GEMINI_API_KEY)} chars)")
    genai.configure(api_key=GEMINI_API_KEY)
    genai_initialized = True
    print("[OK] Google Gemini API initialized successfully")
else:
    print("[ERROR] GEMINI_API_KEY not found in environment variables!")
    print("[INFO] Make sure you have a .env file with: GEMINI_API_KEY=your-key-here")
    print("[INFO] Or set it as: export GEMINI_API_KEY=your-key-here")

# Global variables to cache ML models (load once at startup)
combined_embeddings = None
vectorizer = None
sampled_data = None
all_ingredients_set = set()  # Cache for ingredient suggestions

# Must be defined before load_ml_models(): pickled TfidfVectorizer references __main__.recipe_tokenizer
def recipe_tokenizer(sentence):
    # Remove punctuation and set to lower case
    for punctuation_mark in string.punctuation:
        sentence = sentence.replace(punctuation_mark, '').lower()

    # Split sentence into words
    listofwords = sentence.split(' ')
    listofstemmed_words = []

    # Remove stopwords and stem words
    for word in listofwords:
        if (word not in ENGLISH_STOP_WORDS) and (word != ''):
            # Stem words
            stemmed_word = stemmer.stem(word)
            listofstemmed_words.append(stemmed_word)

    return listofstemmed_words

def extract_ingredient_name(ingredient_str):
    """Extract just the ingredient name, removing quantities, measurements, and extra info."""
    if not isinstance(ingredient_str, str):
        return ""

    name = ingredient_str.strip()

    # Remove parenthetical quantities: "(15-Ounce)", "(10-Ounce)" etc
    name = re.sub(r'\([^)]*\)', ' ', name)

    # Strip ALL punctuation and noise characters from start and end
    # (data has trailing "']", "']\"", etc from list/array formatting)
    name = name.strip(" '\",.;:-!?@#$%^&*[]{}()|/\\<>`~_+=»«")

    # Remove leading numbers and measurements: "1 ", "15-", "1/2 ", "14 1/2-"
    name = re.sub(r'^[\d\s\-/]+', '', name)

    # Remove leading measurement words
    name = re.sub(
        r'^(can\s+of\s+|cup\s+|cups\s+|tablespoon[s]?\s+|teaspoon[s]?\s+|tbsp\s+|tsp\s+|'
        r'ounce[s]?\s+|gram[s]?\s+|pound[s]?\s+|package[s]?\s+|jar[s]?\s+|bottle[s]?\s+'
        r'|dash\s+|pinch\s+|drop[s]?\s+|sprinkle\s+|and\s+|or\s+|a\s+|an\s+|the\s+|for\s+|from\s+|of\s+|with\s+)',
        '', name, flags=re.IGNORECASE
    )

    # Strip again in case removal left trailing noise
    name = name.strip(" '\",.;:-!?@#$%^&*[]{}()|/\\<>`~_+=»«")

    # If nothing meaningful left, return empty
    if len(name) < 3:
        return ""

    return name

def load_ml_models():
    """Load all ML models and data at startup"""
    global combined_embeddings, vectorizer, sampled_data, all_ingredients_set
    try:
        print("Loading ML models...")
        with open('input/combined_embeddings.pkl', 'rb') as f:
            combined_embeddings = pickle.load(f)
        with open('input/tfidf_vectorizer.pkl', 'rb') as f:
            vectorizer = pickle.load(f)

        # Load recipe data from JSON for pandas version compatibility
        with open('input/sampled_data.json', 'r') as f:
            recipe_data = json.load(f)
        sampled_data = pd.DataFrame(recipe_data)

        # Extract all unique ingredients for autocomplete (clean names only)
        print("Extracting ingredients for autocomplete...")
        for ingredients_str in sampled_data['Ingredients']:
            if isinstance(ingredients_str, str):
                for ing in ingredients_str.split(','):
                    clean_name = extract_ingredient_name(ing).lower()
                    if clean_name and len(clean_name) >= 3:  # Only keep meaningful names
                        all_ingredients_set.add(clean_name)

        print(f"Loaded {len(all_ingredients_set)} unique ingredients for autocomplete")
        print("ML models loaded successfully!")
        return True
    except FileNotFoundError as e:
        print(f"Error loading ML models: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error loading ML models: {e}")
        return False

# Load models at startup
models_loaded = load_ml_models()


def _log(msg: str):
    ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"[{ts}] {msg}")


def scheduled_retrain():
    """
    Retrain the model and refresh in-memory artifacts.

    This runs the Node retraining pipeline (which exports approved recipes,
    writes versioned artifacts, updates active.json, and updates Backend/input/).
    After that, this function reloads the pickles so the Flask process starts
    using the new model without a restart.
    """
    global models_loaded

    backend_root = os.path.dirname(os.path.abspath(__file__))

    bump = os.environ.get("RETRAIN_BUMP", "patch").strip() or "patch"
    max_features = os.environ.get("RETRAIN_MAX_FEATURES", "2000").strip() or "2000"
    limit = os.environ.get("RETRAIN_LIMIT", "").strip()
    activate = os.environ.get("RETRAIN_ACTIVATE", "true").strip().lower() != "false"

    cmd = [
        "node",
        os.path.join("scripts", "run-retrain.js"),
        "--bump",
        bump,
        "--activate",
        "true" if activate else "false",
        "--maxFeatures",
        str(max_features),
    ]
    if limit:
        cmd.extend(["--limit", limit])

    _log(f"Scheduled retrain starting (bump={bump}, maxFeatures={max_features}, limit={limit or 'all'})")

    try:
        run = subprocess.run(
            cmd,
            cwd=backend_root,
            capture_output=True,
            text=True,
            check=False,
        )
        if run.returncode != 0:
            _log("Scheduled retrain failed")
            if run.stdout:
                print(run.stdout)
            if run.stderr:
                print(run.stderr)
            return False

        _log("Scheduled retrain pipeline completed successfully")
        if run.stdout:
            print(run.stdout)

        # Reload models so this process uses the new artifacts.
        models_loaded = load_ml_models()
        if models_loaded:
            _log("ML models reloaded after retrain")
        else:
            _log("ML models failed to reload after retrain (check input/ artifacts)")
        return models_loaded
    except Exception as e:
        _log(f"Scheduled retrain error: {e}")
        return False


def start_retrain_scheduler():
    enabled = os.environ.get("RETRAIN_SCHEDULER_ENABLED", "true").strip().lower() != "false"
    if not enabled:
        return

    try:
        interval_hours = float(os.environ.get("RETRAIN_INTERVAL_HOURS", "6"))
    except Exception:
        interval_hours = 6.0

    if interval_hours <= 0:
        interval_hours = 6.0

    interval_seconds = int(interval_hours * 60 * 60)

    # Required log line for the task output.
    _log(f"Scheduler started - next retrain in {int(interval_hours)} hours")

    def loop():
        # Run once shortly after startup, then every interval.
        time.sleep(5)
        while True:
            ok = scheduled_retrain()
            if ok:
                _log("Scheduled retrain job executed successfully")
            # Sleep until next run
            time.sleep(interval_seconds)

    t = threading.Thread(target=loop, daemon=True)
    t.start()

# List available FREE TIER Gemini models for debugging
if genai_initialized:
    try:
        print("\n[INFO] Available FREE TIER Gemini models:")
        # Gemini 3 and 2.5 models are the latest free tier
        free_tier_prefixes = [
            'gemini-3-flash',
            'gemini-3.1-flash',
            'gemini-2.5-flash',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
        ]

        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                model_name = m.name
                # Check if it's a free tier model
                is_free = any(prefix in model_name for prefix in free_tier_prefixes)
                if is_free:
                    print(f"  [OK] {model_name} (FREE - 15 RPM)")
                elif 'gemma' in model_name.lower():
                    print(f"  [OK] {model_name} (FREE - Gemma open model)")
                elif 'gemini' in model_name.lower():
                    print(f"  [INFO] {model_name} (Paid tier - Not recommended)")
        print()
    except Exception as e:
        print(f"Could not list Gemini models: {e}")

# Function to find similar recipes and return Title, Ingredients (as a list), Instructions, and coverage score
def find_similar_recipes(user_input, num_similar=6):
    """Find similar recipes using cached ML models with ingredient coverage scoring."""
    if not models_loaded:
        return None, "ML models not loaded. Please restart the service.", 500

    try:
        # Process the user input (ingredient list)
        user_input_clean = user_input.lower().strip()
        user_data = pd.DataFrame({'text_data': [user_input_clean]})

        # Vectorize the user input
        user_vectorized_data = vectorizer.transform(user_data['text_data'])

        # combined_embeddings = [TF-IDF features + 100 word2vec]
        # We need to match TF-IDF dimensions BEFORE adding the 100 word2vec dimensions
        total_embedding_features = combined_embeddings.shape[1]
        tfidf_features_in_embeddings = total_embedding_features - 100  # Remove the 100 word2vec dims

        # Convert to array if needed for dimension manipulation
        user_array = user_vectorized_data.toarray()
        user_tfidf_features = user_array.shape[1]

        if user_tfidf_features != tfidf_features_in_embeddings:
            if user_tfidf_features > tfidf_features_in_embeddings:
                # Truncate extra TF-IDF features to match what embeddings have
                user_tfidf = user_array[:, :tfidf_features_in_embeddings]
            else:
                # Pad with zeros for missing TF-IDF features
                num_missing = tfidf_features_in_embeddings - user_tfidf_features
                user_tfidf = np.pad(user_array, ((0, 0), (0, num_missing)))
        else:
            user_tfidf = user_array

        # Now apply weighting and add the 100 word2vec dimensions
        ingredient_weight = 0.8
        text_weight = 0.2
        user_combined_embeddings = np.concatenate([user_tfidf * text_weight, np.zeros((1, 100))], axis=1)

        # Compute cosine similarity between weighted user input and recipe embeddings
        cosine_sim_matrix = cosine_similarity(user_combined_embeddings, combined_embeddings)

        # Get similarity scores and indices of top recipes
        sim_scores = cosine_sim_matrix[0]
        top_indices = sim_scores.argsort()[::-1][:num_similar]

        # Fetch titles, ingredients, and instructions for the top similar recipes
        similar_recipe_info = sampled_data.iloc[top_indices][['Title', 'Ingredients', 'Instructions']].copy()

        # Split ingredients into list and compute coverage score for each recipe
        def compute_ingredients_and_coverage(recipe_ingredients_str, user_ingredients):
            if not isinstance(recipe_ingredients_str, str):
                return [], 0.0

            # Parse recipe ingredients (assumes comma-separated, clean them up)
            recipe_ingredients = [ing.strip().lower() for ing in recipe_ingredients_str.split(',') if ing.strip()]

            if not user_ingredients or not recipe_ingredients:
                return recipe_ingredients, 0.0

            # Count how many user ingredients appear in recipe (partial match)
            matched_count = 0
            for user_ing in user_ingredients:
                for recipe_ing in recipe_ingredients:
                    # Check if user ingredient is contained in recipe ingredient or vice versa
                    if user_ing in recipe_ing or recipe_ing in user_ing:
                        matched_count += 1
                        break  # Count each user ingredient only once

            # Coverage score: percentage of user ingredients that are used in recipe
            coverage_score = (matched_count / len(user_ingredients)) * 100 if user_ingredients else 0.0

            return recipe_ingredients, round(coverage_score, 1)

        # Parse user ingredients once before applying to all recipes
        user_ingredients = [ing.strip().lower() for ing in user_input_clean.split(',') if ing.strip()]

        # Apply to all recipes
        ingredients_and_coverage = similar_recipe_info['Ingredients'].apply(
            lambda x: compute_ingredients_and_coverage(x, user_ingredients)
        )
        similar_recipe_info['Ingredients'] = ingredients_and_coverage.apply(lambda x: x[0])
        similar_recipe_info['coverage_score'] = ingredients_and_coverage.apply(lambda x: x[1])

        # Sort by coverage score (higher coverage first), then by similarity
        similar_recipe_info = similar_recipe_info.sort_values(
            by=['coverage_score', 'Title'],
            ascending=[False, True]
        )

        # Compute smart suggestions: ingredients from user input that are NOT in each recipe
        def compute_missing_ingredients(recipe_ingredients):
            missing = []
            for user_ing in user_ingredients:
                user_ing_lower = user_ing.lower()
                is_in_recipe = False
                for recipe_ing in recipe_ingredients:
                    if user_ing_lower in recipe_ing.lower() or recipe_ing.lower() in user_ing_lower:
                        is_in_recipe = True
                        break
                if not is_in_recipe:
                    missing.append(user_ing.strip().title())
            return missing

        similar_recipe_info['missing_ingredients'] = similar_recipe_info['Ingredients'].apply(
            compute_missing_ingredients
        )

        return similar_recipe_info, None, None
    except Exception as e:
        return None, f"Error finding recipes: {str(e)}", 500


def is_valid_input(user_input):
    tokenized_input = recipe_tokenizer(user_input)
    
    # Check if the tokenized input is empty
    if not tokenized_input:
        return False

    # Spell-check validation
    misspelled = spell.unknown(tokenized_input)
    
    # If more than half of the words are misspelled, consider it invalid input
    if len(misspelled) > len(tokenized_input) * 0.5:
        return False
    return True


@app.route('/')
def index():
    """Root endpoint for health checks"""
    return jsonify({"message": "Recipe Recommendation API", "status": "running"}), 200

@app.route('/health')
def health():
    """Health check endpoint for Render monitoring"""
    return jsonify({"status": "healthy"}), 200

@app.route('/ingredients/suggest', methods=['GET'])
def suggest_ingredients():
    """Autocomplete endpoint for ingredient suggestions"""
    query = request.args.get('q', '').strip().lower()
    limit = int(request.args.get('limit', 10))

    if not query or len(query) < 2:
        return jsonify({"suggestions": []})

    # Find ingredients that start with or contain the query
    suggestions = sorted(
        [ing for ing in all_ingredients_set if query in ing],
        key=lambda x: (not x.startswith(query), x)  # Prioritize starts-with matches
    )[:limit]

    # Capitalize for display
    suggestions_display = [s.title() for s in suggestions]

    return jsonify({"suggestions": suggestions_display})

@app.route('/recommend', methods=['POST'])
def recommend():
    user_input = request.form.get('ingredients', '')

    if not is_valid_input(user_input):
        return jsonify({"message": "Input doesn't contain recognizable ingredients. Please enter valid ingredients."}), 400

    if not user_input:
        return jsonify({"message": "Please provide valid input."}), 400

    # Use the cached models for faster response
    recommendations, error_message, status_code = find_similar_recipes(user_input)

    if error_message:
        return jsonify({"message": error_message}), status_code or 500

    if recommendations is not None and not recommendations.empty:
        recommendations_list = recommendations.to_dict(orient='records')
        return jsonify(recommendations_list)
    else:
        return jsonify({"message": "No recommendations found. Try entering different ingredients."}), 404


# AI Recipe Modification Functions
def format_ingredients(ingredients) -> str:
    """Format ingredients list for LLM prompt"""
    if isinstance(ingredients, list):
        return '\n'.join([f"- {ing}" for ing in ingredients])
    elif isinstance(ingredients, str):
        return ingredients
    return ""

def format_instructions(instructions) -> str:
    """Format instructions list for LLM prompt"""
    if isinstance(instructions, list):
        return '\n'.join([f"{i+1}. {step}" for i, step in enumerate(instructions)])
    elif isinstance(instructions, str):
        return instructions
    return ""

def build_conversation_context(conversation_history: List[Dict], new_request: str) -> str:
    """Build context string from conversation history"""
    context_str = ""

    if conversation_history:
        context_str = "Previous conversation:\n"
        for msg in conversation_history[-3:]:  # Only last 3 messages to manage context
            if msg.get('role') == 'user':
                context_str += f"User: {msg.get('content', '')}\n"
            elif msg.get('role') == 'assistant':
                if msg.get('changes'):
                    context_str += f"Assistant (modified: {msg.get('changes')}): {msg.get('content', '')}\n"
                else:
                    context_str += f"Assistant: {msg.get('content', '')}\n"
        context_str += "\n"

    context_str += f"Current request: {new_request}"
    return context_str

def extract_ingredient_names(ingredients) -> List[str]:
    """Extract ingredient names (remove quantities and measurements)"""
    names = []
    if isinstance(ingredients, list):
        for ing in ingredients:
            clean = extract_ingredient_name(ing)
            if clean:
                names.append(clean.lower())
    return names

def is_modification_too_drastic(original_recipe: Dict, updated_recipe: Dict) -> Tuple[bool, str]:
    """
    Check if changes are too extensive (>30% ingredients changed)
    Returns: (is_too_drastic, reason)
    """
    original_ings = set(extract_ingredient_names(original_recipe.get('ingredients', [])))
    updated_ings = set(extract_ingredient_names(updated_recipe.get('ingredients', [])))

    if not original_ings or not updated_ings:
        return False, ""

    overlap = original_ings & updated_ings
    overlap_ratio = len(overlap) / len(original_ings)

    if overlap_ratio < 0.7:
        removed = original_ings - updated_ings
        added = updated_ings - original_ings
        reason = f"This change would remove {len(removed)} ingredients and add {len(added)} new ones. " \
                 f"Only {int(overlap_ratio * 100)}% of original ingredients would remain. " \
                 f"Please make smaller changes or try a different recipe."
        return True, reason

    return False, ""

def call_gemini_for_modification(current_recipe: Dict, conversation_context: str) -> Dict:
    """Call Google Gemini API to modify the recipe"""
    if not genai_initialized:
        raise ValueError("Google Gemini API is not initialized. Please set GEMINI_API_KEY in environment.")

    # Use LATEST FREE TIER models in order of preference:
    # Gemini 3 Series (Latest Preview, FREE, 15 RPM):
    #   - gemini-3-flash-preview: High-speed, general-purpose
    #
    # Gemini 2.5 Series (Latest, FREE, 15 RPM for Flash):
    #   - gemini-2.5-flash: Balanced, fast, low-latency
    #   - gemini-2.5-flash-lite: Efficient, cost-effective
    #
    # Gemini 1.5 Series (Stable, FREE, 15 RPM):
    #   - gemini-1.5-flash: Fast, reliable
    #   - gemini-1.5-pro: Smarter, more capable

    free_models = [
        # Gemini 2.5 Flash - Distribute load across variations
        'models/gemini-2.5-flash',
        'models/gemini-2.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',

        # Gemini 1.5 Flash - Alternate models to avoid rate limits
        'models/gemini-1.5-flash-001',
        'models/gemini-1.5-flash',

        # Gemini 1.5 Pro - Good for complex modifications
        'models/gemini-1.5-pro-001',
        'models/gemini-1.5-pro',

        # Gemma Open Models - Have separate quotas
        'models/gemma-3-27b-it',
        'models/gemma-4-26b-a4b-it',

        # Older Gemini Models
        'models/gemini-pro',
        'gemini-pro',
    ]

    print(f"Attempting to use latest free tier model...")

    model = None
    for model_name in free_models:
        try:
            model = genai.GenerativeModel(model_name)
            print(f"[OK] Successfully initialized model: {model_name}")
            break
        except Exception as e:
            print(f"[WARN] {model_name} not available: {str(e)[:50]}")
            continue

    if model is None:
        raise Exception("Could not initialize any free tier Gemini model. Check API key and network connection.")

    prompt = f"""You are a recipe customization assistant. The user wants to modify an existing recipe.
Your job is to make ONLY the changes requested, keeping everything else exactly the same.

## Current Recipe
Title: {current_recipe.get('title', 'Recipe')}
Ingredients ({len(current_recipe.get('ingredients', []))} total):
{format_ingredients(current_recipe.get('ingredients', []))}

Instructions ({len(current_recipe.get('instructions', []))} steps):
{format_instructions(current_recipe.get('instructions', []))}

## Conversation Context
{conversation_context}

## Your Task
Make ONLY the changes the user requested. Keep everything else exactly the same.
- Add new ingredients if needed
- Remove or replace ingredients if requested
- Adjust cooking times or methods if needed
- Update quantities if substitutions change proportions
- Keep the core recipe structure intact

IMPORTANT CONSTRAINTS:
1. If the user's request would require changing MORE THAN 30% of ingredients, politely suggest they try a different recipe instead
2. NEVER create an entirely new recipe - only modify the existing one
3. Maintain the same cooking flow and style
4. Update quantities proportionally when substituting ingredients
5. If request is impossible (e.g., "make vegan" when recipe has no meat), explain why
6. Keep ingredient descriptions concise - use standard measurements and brief descriptions

## CRITICAL RESPONSE REQUIREMENTS
You MUST return responses in THIS EXACT JSON format. NO other text before or after:
```json
{{
  "changes_summary": "Brief one-sentence description of what changed",
  "updated_title": "Modified recipe title if changed (otherwise keep original)",
  "updated_ingredients": ["Full updated ingredient list with quantities"],
  "updated_instructions": ["Full updated step-by-step instructions"],
  "ai_response": "Conversational response explaining what you changed and why"
}}
```

IMPORTANT:
- Start your response with {{ and end with }}
- NO introductory text
- NO explanatory paragraphs before JSON
- NO markdown formatting outside the JSON
- Just the JSON object and nothing else
- Ensure the JSON is valid syntax (all quotes, commas, brackets correct)
- Keep ingredient descriptions brief and standard

Examples of good changes_summary:
- "Made it vegetarian by replacing chicken with chickpeas"
- "Made it spicier by adding red pepper flakes and cayenne"
- "Reduced fat by using low-fat cheese and less oil"

Examples of bad changes (reject with ai_response explaining why):
- Changing 80% of ingredients - reject
- Creating a completely different recipe - reject
"""

    # Call Gemini API
    try:
        print(f"\n{'='*60}")
        print(f"🤖 Calling Gemini API...")
        model_name = getattr(model, '_model_name', 'unknown')
        print(f"Model: {model_name}")
        print(f"Request: '{new_request if 'new_request' in locals() else 'unknown'}'")
        print(f"{'='*60}\n")

        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,  # Lower for more consistent modifications
                "max_output_tokens": 32768,  # Maximum for very complex recipes (78+ ingredients)
                "top_p": 0.8,
            }
        )

        raw_response = response.text if response.text else ""

    except Exception as api_error:
        error_str = str(api_error)

        # Check if it's a rate limit (429) error
        if '429' in error_str or 'quota' in error_str.lower():
            print(f"[WARN] Rate limit hit on current model: {model_name}")

            # Try the next model in the list
            try:
                current_model_index = free_models.index(model_name) if model_name in free_models else -1
            except ValueError:
                current_model_index = -1

            if current_model_index >= 0 and current_model_index < len(free_models) - 1:
                # Try the next model
                next_models = free_models[current_model_index + 1:]
                print(f"🔄 Trying {len(next_models)} alternative models...")

                for next_model_name in next_models[:3]:  # Try up to 3 alternatives
                    try:
                        print(f"🔄 Trying alternative model: {next_model_name}")
                        alt_model = genai.GenerativeModel(next_model_name)
                        alt_response = alt_model.generate_content(
                            prompt,
                            generation_config={
                                "temperature": 0.3,
                                "max_output_tokens": 32768,
                                "top_p": 0.8,
                            }
                        )
                        print(f"[OK] Success with alternative model: {next_model_name}")
                        raw_response = alt_response.text if alt_response.text else ""

                        # Skip to the cleanup code (continue with raw_response)
                        break
                    except Exception as alt_error:
                        print(f"[WARN] {next_model_name} also failed: {str(alt_error)[:50]}")
                        continue

                if not raw_response:
                    return {
                        "error": "All models rate-limited",
                        "ai_response": "All available models are currently rate-limited. Please try again in 1-2 minutes.",
                        "updated_title": current_recipe.get('title', 'Recipe'),
                        "updated_ingredients": current_recipe.get('ingredients', []),
                        "updated_instructions": current_recipe.get('instructions', []),
                        "changes_summary": "Unable to apply changes - rate limit"
                    }
            else:
                return {
                    "error": "Rate limit exceeded",
                    "ai_response": "The API rate limit has been exceeded. Please try again in 1-2 minutes.",
                    "updated_title": current_recipe.get('title', 'Recipe'),
                    "updated_ingredients": current_recipe.get('ingredients', []),
                    "updated_instructions": current_recipe.get('instructions', []),
                    "changes_summary": "Unable to apply changes - rate limit"
                }
        else:
            # Not a rate limit error, return error response instead of raising
            print(f"[ERROR] API Error: {error_str}")
            return {
                "error": "API error",
                "ai_response": f"An error occurred while contacting the AI service: {str(api_error)[:200]}",
                "updated_title": current_recipe.get('title', 'Recipe'),
                "updated_ingredients": current_recipe.get('ingredients', []),
                "updated_instructions": current_recipe.get('instructions', []),
                "changes_summary": "Unable to apply changes - API error"
            }

        print(f"📥 RAW AI RESPONSE (Full):")
        print(f"{'='*60}")
        print(raw_response)
        print(f"{'='*60}\n")

        # Check if response appears truncated
        response_text = raw_response.strip()
        if response_text and not response_text.endswith('}') and not response_text.endswith(']'):
            print(f"[WARN] WARNING: Response appears to be truncated (length: {len(raw_response)} chars)")
            print(f"[WARN] Recipe has {len(current_recipe.get('ingredients', []))} ingredients")
            print(f"[WARN] Recipe has {len(current_recipe.get('instructions', []))} instructions")
            print(f"[WARN] Response may be too large or recipe too complex\n")

        response_text = raw_response.strip()

        # Clean up the response (remove markdown code blocks if present)
        print(f"🧹 Cleaning response...")

        # Remove various markdown formatting patterns
        if response_text.startswith("```json"):
            response_text = response_text[7:]
            print("  - Removed ```json prefix")
        elif response_text.startswith("```"):
            response_text = response_text[3:]
            print("  - Removed ``` prefix")

        if response_text.endswith("```"):
            response_text = response_text[:-3]
            print("  - Removed ``` suffix")

        # Remove any remaining JSON/ code blocks
        if "```json" in response_text:
            response_text = response_text.replace("```json", "")
            print("  - Removed remaining ```json")
        if "```" in response_text:
            response_text = response_text.replace("```", "")
            print("  - Removed remaining ```")

        response_text = response_text.strip()

        print(f"🧹 CLEANED RESPONSE:")
        print(f"{'='*60}")
        print(response_text)
        print(f"{'='*60}\n")

        # Try multiple parsing strategies
        result = None
        parse_error = None

        # Strategy 1: Use json module (safer)
        print("Strategy 1: Attempting json.loads()...")
        try:
            import json
            result = json.loads(response_text)
            print("[OK] SUCCESS: JSON parsed successfully with json.loads()")
            print(f"  - Keys: {list(result.keys())}")
            print(f"  - Updated ingredients count: {len(result.get('updated_ingredients', []))}")
            print(f"  - Updated instructions count: {len(result.get('updated_instructions', []))}")
            print(f"{'='*60}\n")
            return result
        except json.JSONDecodeError as e:
            parse_error = f"json.loads(): {str(e)}"
            print(f"[WARN] FAILED: {parse_error}")

        # Strategy 2: Fix common JSON issues and try again
        print("\nStrategy 2: Fixing common JSON issues and retrying...")
        try:
            # Fix common issues: single quotes, trailing commas, etc.
            fixed = response_text.replace("'", '"')
            # Remove trailing commas before closing brackets/braces
            fixed = fixed.replace(', }', ' }').replace(', ]', ' ]')

            import json
            result = json.loads(fixed)
            print("[OK] SUCCESS: JSON parsed successfully after fixes")
            print(f"  - Keys: {list(result.keys())}")
            print(f"{'='*60}\n")
            return result
        except json.JSONDecodeError as e:
            print(f"[WARN] FAILED: JSON parsing after fixes: {str(e)}")

        # Strategy 3: Use eval as last resort
        print("\nStrategy 3: Attempting eval() as last resort...")
        try:
            result = eval(response_text)
            print("[OK] SUCCESS: JSON parsed with eval()")
            print(f"  - Keys: {list(result.keys())}")
            print(f"{'='*60}\n")
            return result
        except Exception as e:
            print(f"[WARN] FAILED: eval() - {str(e)}")

        # If all strategies fail, return error with debugging info
        print(f"\n{'='*60}")
        print("[ERROR] ALL JSON PARSING STRATEGIES FAILED")
        print(f"{'='*60}")

        # Fallback: Try to extract useful info from the response
        # Sometimes the AI returns text but includes the modification in the text

        print(f"\n📊 DEBUG INFO:")
        print(f"  - Raw response length: {len(raw_response)} chars")
        print(f"  - Cleaned response length: {len(response_text)} chars")
        print(f"  - First 200 chars of raw: {raw_response[:200]}")
        print(f"  - Last error: {parse_error}")
        print(f"  - Model: {getattr(model, '_model_name', 'unknown')}")

        return {
            "error": "Failed to parse AI response",
            "ai_response": "This recipe is quite large (" + str(len(current_recipe.get('ingredients', []))) + " ingredients), and I had trouble processing the entire modification. " +
                          "The AI system generated a response but it was incomplete. " +
                          "Please try a simpler recipe or ask for a simpler modification.",
            "debug_info": {
                "raw_response": raw_response[:500],  # Limit debug info size
                "parse_error": parse_error,
                "model": getattr(model, '_model_name', 'unknown'),
                "response_length": len(raw_response),
                "recipe_size": {
                    "ingredients": len(current_recipe.get('ingredients', [])),
                    "instructions": len(current_recipe.get('instructions', []))
                }
            },
            # Provide a safe fallback that keeps the original recipe
            "updated_title": current_recipe.get('title', 'Recipe'),
            "updated_ingredients": current_recipe.get('ingredients', []),
            "updated_instructions": current_recipe.get('instructions', []),
            "changes_summary": "Unable to apply changes - recipe too complex"
        }

    except Exception as e:
        error_msg = f"Gemini API error: {str(e)}"
        print(f"\n[ERROR] {error_msg}")
        print(f"{'='*60}\n")
        return {
            "error": "API error",
            "ai_response": f"An error occurred: {str(e)[:200]}",
            "updated_title": current_recipe.get('title', 'Recipe'),
            "updated_ingredients": current_recipe.get('ingredients', []),
            "updated_instructions": current_recipe.get('instructions', []),
            "changes_summary": "Unable to apply changes - unexpected error"
        }

@app.route('/ai-modify-recipe', methods=['POST'])
def modify_recipe():
    """Modify an existing recipe based on user's conversational request"""
    try:
        print(f"\n{'='*70}")
        print(f"🔔 /ai-modify-recipe endpoint called")
        print(f"{'='*70}")

        data = request.get_json()

        if not data:
            print("[ERROR] No data provided in request")
            return jsonify({"error": "No data provided"}), 400

        current_recipe = data.get('current_recipe')
        conversation_history = data.get('conversation_history', [])
        new_request = data.get('new_request')

        print(f"📝 Request Details:")
        print(f"  - Recipe title: {current_recipe.get('title', 'Unknown')}")
        print(f"  - Recipe has {len(current_recipe.get('ingredients', []))} ingredients")
        print(f"  - Recipe has {len(current_recipe.get('instructions', []))} instructions")
        print(f"  - Conversation history: {len(conversation_history)} messages")
        print(f"  - New request: '{new_request}'")

        if not current_recipe or not new_request:
            print("[ERROR] Missing required fields")
            return jsonify({"error": "Missing required fields: current_recipe and new_request are required"}), 400

        if not genai_initialized:
            print("[ERROR] AI service not initialized")
            return jsonify({"error": "AI service not available. Please contact administrator."}), 503

        # Build conversation context
        print("\n[INFO] Building conversation context...")
        conversation_context = build_conversation_context(conversation_history, new_request)
        print(f"  - Context length: {len(conversation_context)} chars")

        # Call Gemini API
        print(f"\n🤖 Calling Gemini API...")
        try:
            ai_result = call_gemini_for_modification(current_recipe, conversation_context)
            print("\n[OK] AI call completed successfully")
        except Exception as e:
            print(f"\n[ERROR] AI call failed: {str(e)}")
            return jsonify({"error": f"AI service error: {str(e)}"}), 500

        # Safety check: ensure ai_result is not None and is a dictionary
        if not ai_result or not isinstance(ai_result, dict):
            print(f"\n[ERROR] AI returned invalid result: {type(ai_result)}")
            return jsonify({"error": "AI service returned invalid response. Please try again."}), 500

        # Check for errors from AI
        if ai_result.get('error'):
            print(f"\n[WARN] AI returned error: {ai_result.get('error')}")
            print(f"  - AI response: {ai_result.get('ai_response', '')}")
            return jsonify({"error": ai_result['error'], "ai_response": ai_result.get('ai_response', '')}), 400

        print("\n[OK] AI response successful:")
        print(f"  - Changes summary: {ai_result.get('changes_summary', '')}")
        print(f"  - Updated title: {ai_result.get('updated_title', '')}")
        print(f"  - Updated ingredients: {len(ai_result.get('updated_ingredients', []))}")
        print(f"  - Updated instructions: {len(ai_result.get('updated_instructions', []))}")

        # Validate that modification isn't too drastic
        print("\n[INFO] Validating modification scope...")
        is_too_drastic, reason = is_modification_too_drastic(current_recipe, ai_result)
        if is_too_drastic:
            print(f"[ERROR] Modification too drastic: {reason}")
            return jsonify({
                "error": "Modification too extensive",
                "ai_response": reason,
                "suggestion": "Try making smaller changes or look for a different recipe."
            }), 400

        print("[OK] Modification validation passed")

        # Build updated recipe object
        updated_recipe = {
            "title": ai_result.get('updated_title', current_recipe.get('title', 'Recipe')),
            "ingredients": ai_result.get('updated_ingredients', current_recipe.get('ingredients', [])),
            "instructions": ai_result.get('updated_instructions', current_recipe.get('instructions', [])),
            "modified": True,
            "modification_changes": ai_result.get('changes_summary', '')
        }

        print(f"\n{'='*70}")
        print("SUCCESS: Recipe modified successfully")
        print(f"{'='*70}\n")

        return jsonify({
            "updated_recipe": updated_recipe,
            "changes_summary": ai_result.get('changes_summary', ''),
            "ai_response": ai_result.get('ai_response', '')
        }), 200

    except Exception as e:
        print(f"\n[ERROR] SERVER ERROR: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}"}), 500



# Run the Flask app
if __name__ == "__main__":
    # Get port from environment variable or default to 5000
    port = int(os.environ.get('PORT', 5000))
    # Start background retraining scheduler (every 6 hours by default)
    start_retrain_scheduler()
    # Always run with debug=False in production
    app.run(host='0.0.0.0', port=port, debug=False)
