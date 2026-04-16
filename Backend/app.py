# Import necessary libraries
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import pickle
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

def load_ml_models():
    """Load all ML models and data at startup"""
    global combined_embeddings, vectorizer, sampled_data
    try:
        print("Loading ML models...")
        with open('input/combined_embeddings.pkl', 'rb') as f:
            combined_embeddings = pickle.load(f)
        with open('input/tfidf_vectorizer.pkl', 'rb') as f:
            vectorizer = pickle.load(f)
        with open('input/sampled_data.pkl', 'rb') as f:
            sampled_data = pickle.load(f)
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

# Function to tokenize the recipe input
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

# Function to find similar recipes and return Title, Ingredients (as a list), and Instructions
def find_similar_recipes(user_input, num_similar=3):
    """Find similar recipes using cached ML models"""
    if not models_loaded:
        return None, "ML models not loaded. Please restart the service.", 500

    try:
        # Process the user input (ingredient list)
        user_input = user_input.lower()
        user_data = pd.DataFrame({'text_data': [user_input]})

        # Vectorize the user input
        user_vectorized_data = vectorizer.transform(user_data['text_data'])

        # Ensure the number of features in user_vectorized_data matches combined_embeddings
        num_missing_features = combined_embeddings.shape[1] - user_vectorized_data.shape[1]
        if num_missing_features > 0:
            # Add zero columns to match feature sizes
            user_vectorized_data = np.pad(user_vectorized_data.toarray(), ((0, 0), (0, num_missing_features)))

        # Apply ingredient weighting
        ingredient_weight = 0.8
        text_weight = 0.2
        user_combined_embeddings = np.concatenate([user_vectorized_data * text_weight, np.zeros((1, 100))], axis=1)

        # Compute cosine similarity between the user input and combined embeddings
        cosine_sim_matrix = cosine_similarity(user_vectorized_data, combined_embeddings)

        # Get indices of the top similar recipes
        similar_recipes = cosine_sim_matrix[0].argsort()[::-1][:num_similar]

        # Fetch titles, ingredients, and instructions for the top similar recipes
        similar_recipe_info = sampled_data.iloc[similar_recipes][['Title', 'Ingredients', 'Instructions']]

        # Split ingredients into list if they are stored as a string (assuming comma-separated)
        similar_recipe_info['Ingredients'] = similar_recipe_info['Ingredients'].apply(lambda x: x.split(','))

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
