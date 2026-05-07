"""
Create ML model files compatible with numpy 1.24.4
Run this to regenerate pickle files with the correct numpy version
"""
import pickle
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
import os

print(f"NumPy version: {np.__version__}")
print(f"Pandas version: {pd.__version__}")

# Create sample recipe data that's more realistic
recipes = [
    {
        'Title': 'Simple Tomato Pasta',
        'Ingredients': 'tomato, pasta, garlic, olive oil, basil, salt, pepper',
        'Instructions': 'Boil pasta. Sauté garlic in olive oil. Add tomatoes. Mix with pasta. Garnish with basil.'
    },
    {
        'Title': 'Cheese Quesadilla',
        'Ingredients': 'tortilla, cheese, onion, bell pepper, butter',
        'Instructions': 'Heat butter in pan. Add vegetables. Place tortilla in pan. Add cheese. Fold and cook until crispy.'
    },
    {
        'Title': 'Vegetable Stir Fry',
        'Ingredients': 'broccoli, carrots, bell pepper, soy sauce, ginger, garlic, rice',
        'Instructions': 'Stir fry vegetables with ginger and garlic. Add soy sauce. Serve over rice.'
    },
    {
        'Title': 'Chicken Salad',
        'Ingredients': 'chicken breast, lettuce, tomato, cucumber, olive oil, lemon juice',
        'Instructions': 'Grill chicken. Chop vegetables. Mix with cooked chicken. Dress with olive oil and lemon.'
    },
    {
        'Title': 'Banana Smoothie',
        'Ingredients': 'banana, milk, honey, yogurt, vanilla extract',
        'Instructions': 'Blend all ingredients until smooth. Serve cold.'
    },
    {
        'Title': 'Grilled Cheese Sandwich',
        'Ingredients': 'bread, cheese, butter',
        'Instructions': 'Butter bread slices. Place cheese between. Grill until golden and cheese melts.'
    },
    {
        'Title': 'Vegetable Omelette',
        'Ingredients': 'eggs, milk, cheese, mushrooms, spinach, butter',
        'Instructions': 'Beat eggs with milk. Sauté vegetables. Add eggs. Top with cheese. Fold and serve.'
    },
    {
        'Title': 'Tomato Soup',
        'Ingredients': 'tomato, onion, garlic, vegetable broth, cream, basil, salt, pepper',
        'Instructions': 'Sauté onion and garlic. Add tomatoes and broth. Simmer. Blend. Add cream and basil.'
    },
    {
        'Title': 'Spaghetti Carbonara',
        'Ingredients': 'spaghetti, bacon, eggs, parmesan cheese, black pepper',
        'Instructions': 'Cook spaghetti. Fry bacon. Mix eggs with cheese. Combine all. Serve with pepper.'
    },
    {
        'Title': 'Caesar Salad',
        'Ingredients': 'romaine lettuce, parmesan cheese, croutons, caesar dressing, anchovies',
        'Instructions': 'Chop lettuce. Add cheese and croutons. Toss with caesar dressing. Top with anchovies.'
    }
]

# Create DataFrame
sampled_data = pd.DataFrame(recipes)

# Create TF-IDF vectorizer
print("Creating TF-IDF vectorizer...")
vectorizer = TfidfVectorizer(max_features=100)
vectorizer.fit(sampled_data['Ingredients'].tolist())

# Create embeddings
print("Creating embeddings...")
tfidf_features = vectorizer.transform(sampled_data['Ingredients'].tolist()).toarray()
word2vec_features = np.random.rand(len(recipes), 100)  # Placeholder word2vec
combined_embeddings = np.concatenate([tfidf_features, word2vec_features], axis=1)

print(f"Combined embeddings shape: {combined_embeddings.shape}")

# Ensure input directory exists
input_dir = 'input'
if not os.path.exists(input_dir):
    os.makedirs(input_dir)
    print(f"Created directory: {input_dir}")

# Save to input directory
with open(os.path.join(input_dir, 'combined_embeddings.pkl'), 'wb') as f:
    pickle.dump(combined_embeddings, f)
    print(f"[OK] Saved combined_embeddings.pkl")

with open(os.path.join(input_dir, 'sampled_data.pkl'), 'wb') as f:
    pickle.dump(sampled_data, f)
    print(f"[OK] Saved sampled_data.pkl ({len(sampled_data)} recipes)")

with open(os.path.join(input_dir, 'tfidf_vectorizer.pkl'), 'wb') as f:
    pickle.dump(vectorizer, f)
    print(f"[OK] Saved tfidf_vectorizer.pkl")

print("\n[OK] All pickle files created/updated with numpy", np.__version__)