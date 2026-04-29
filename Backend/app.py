# Import necessary libraries
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import pickle
import re
from sklearn.metrics.pairwise import cosine_similarity
import gensim.models.keyedvectors as word2vec
import string
import nltk
from nltk.corpus import stopwords
from spellchecker import SpellChecker

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
        with open('input/sampled_data.pkl', 'rb') as f:
            sampled_data = pickle.load(f)

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



# Run the Flask app
if __name__ == "__main__":
    # Get port from environment variable or default to 5000
    port = int(os.environ.get('PORT', 5000))
    # Always run with debug=False in production
    app.run(host='0.0.0.0', port=port, debug=False)
