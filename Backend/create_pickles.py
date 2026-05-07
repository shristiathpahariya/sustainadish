"""
Create ML model files - Use JSON for pandas compatibility

This script creates:
- combined_embeddings.pkl (numpy array - pickle version 4)
- sampled_data.json (recipe data - JSON for pandas cross-version compatibility)
- tfidf_vectorizer.pkl (sklearn object - pickle version 4)

JSON is used for recipe data because pandas DataFrames pickle format
changes between versions (e.g., pandas 2.x to 3.x StringDtype changes).

Numpy arrays and sklearn objects are more stable, so pickle protocol 4 works.

Usage:
    python create_pickles.py
"""
import pickle
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
import json
import os

print(f"NumPy version: {np.__version__}")
print(f"Pandas version: {pd.__version__}")

# Create sample recipe data
recipe_data = [
    {
        "Title": "Simple Tomato Pasta",
        "Ingredients": "tomato, pasta, garlic, olive oil, basil, salt, pepper",
        "Instructions": "Boil pasta. Sauté garlic in olive oil. Add tomatoes. Mix with pasta. Garnish with basil."
    },
    {
        "Title": "Cheese Quesadilla",
        "Ingredients": "tortilla, cheese, onion, bell pepper, butter",
        "Instructions": "Heat butter in pan. Add vegetables. Place tortilla in pan. Add cheese. Fold and cook until crispy."
    },
    {
        "Title": "Vegetable Stir Fry",
        "Ingredients": "broccoli, carrots, bell pepper, soy sauce, ginger, garlic, rice",
        "Instructions": "Stir fry vegetables with ginger and garlic. Add soy sauce. Serve over rice."
    },
    {
        "Title": "Chicken Salad",
        "Ingredients": "chicken breast, lettuce, tomato, cucumber, olive oil, lemon juice",
        "Instructions": "Grill chicken. Chop vegetables. Mix with cooked chicken. Dress with olive oil and lemon."
    },
    {
        "Title": "Banana Smoothie",
        "Ingredients": "banana, milk, honey, yogurt, vanilla extract",
        "Instructions": "Blend all ingredients until smooth. Serve cold."
    },
    {
        "Title": "Grilled Cheese Sandwich",
        "Ingredients": "bread, cheese, butter",
        "Instructions": "Butter bread slices. Place cheese between. Grill until golden and cheese melts."
    },
    {
        "Title": "Vegetable Omelette",
        "Ingredients": "eggs, milk, cheese, mushrooms, spinach, butter",
        "Instructions": "Beat eggs with milk. Sauté vegetables. Add eggs. Top with cheese. Fold and serve."
    },
    {
        "Title": "Tomato Soup",
        "Ingredients": "tomato, onion, garlic, vegetable broth, cream, basil, salt, pepper",
        "Instructions": "Sauté onion and garlic. Add tomatoes and broth. Simmer. Blend. Add cream and basil."
    },
    {
        "Title": "Spaghetti Carbonara",
        "Ingredients": "spaghetti, bacon, eggs, parmesan cheese, black pepper",
        "Instructions": "Cook spaghetti. Fry bacon. Mix eggs with cheese. Combine all. Serve with pepper."
    },
    {
        "Title": "Caesar Salad",
        "Ingredients": "romaine lettuce, parmesan cheese, croutons, caesar dressing, anchovies",
        "Instructions": "Chop lettuce. Add cheese and croutons. Toss with caesar dressing. Top with anchovies."
    }
]

# Create pandas DataFrame
print("Creating DataFrame...")
sampled_data = pd.DataFrame(recipe_data)
print(f"DataFrame shape: {sampled_data.shape}")
print(f"DataFrame dtypes:\n{sampled_data.dtypes}")

# Create TF-IDF vectorizer
print("\nCreating TF-IDF vectorizer...")
vectorizer = TfidfVectorizer(max_features=100)
vectorizer.fit(sampled_data['Ingredients'].tolist())

# Create embeddings
print("Creating embeddings...")
tfidf_features = vectorizer.transform(sampled_data['Ingredients'].tolist()).toarray()
word2vec_features = np.random.rand(len(recipe_data), 100)  # Placeholder word2vec
combined_embeddings = np.concatenate([tfidf_features, word2vec_features], axis=1)

print(f"Combined embeddings shape: {combined_embeddings.shape}")

# Ensure input directory exists
input_dir = 'input'
if not os.path.exists(input_dir):
    os.makedirs(input_dir)
    print(f"Created directory: {input_dir}")

# Save files with appropriate formats
print("\nSaving files...")

# 1. Save embeddings as pickle (numpy arrays are stable)
pickle_protocol = 4
with open(os.path.join(input_dir, 'combined_embeddings.pkl'), 'wb') as f:
    pickle.dump(combined_embeddings, f, protocol=pickle_protocol)
    print(f"[OK] Saved combined_embeddings.pkl (pickle protocol {pickle_protocol})")

# 2. Save recipe data as JSON (pandas-compatible across versions)
with open(os.path.join(input_dir, 'sampled_data.json'), 'w') as f:
    json.dump(recipe_data, f, indent=2)
    print(f"[OK] Saved sampled_data.json (JSON format)")

# 3. Save vectorizer as pickle (sklearn objects are stable)
with open(os.path.join(input_dir, 'tfidf_vectorizer.pkl'), 'wb') as f:
    pickle.dump(vectorizer, f, protocol=pickle_protocol)
    print(f"[OK] Saved tfidf_vectorizer.pkl (pickle protocol {pickle_protocol})")

print(f"\n[OK] All model files created/updated")
print(f"    NumPy version: {np.__version__}")
print(f"    Pandas version: {pd.__version__}")
print(f"    Files in: input/ directory")
print(f"\n[INFO] Recipe data saved as JSON for maximum compatibility")
print(f"[INFO] Embedded data and vectorizer saved as pickle")