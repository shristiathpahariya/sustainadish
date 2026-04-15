import pickle
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

# Create placeholder embeddings matrix
# This is a temporary fix - you should replace this with actual trained embeddings
placeholder_embeddings = np.random.rand(100, 100)

# Create placeholder sampled_data
placeholder_data = pd.DataFrame({
    'Title': ['Recipe 1', 'Recipe 2', 'Recipe 3'],
    'Ingredients': ['ingredient1,ingredient2,ingredient3', 'ingredient1,ingredient4', 'ingredient2,ingredient3,ingredient4'],
    'Instructions': ['Heat pan and cook ingredients', 'Mix all ingredients together', 'Bake in oven for 30 minutes']
})

# Create placeholder vectorizer
vectorizer = TfidfVectorizer(max_features=100)
vectorizer.fit(['sample text for vectorization'])

# Save the files
with open('combined_embeddings.pkl', 'wb') as f:
    pickle.dump(placeholder_embeddings, f)

with open('sampled_data.pkl', 'wb') as f:
    pickle.dump(placeholder_data, f)

with open('tfidf_vectorizer.pkl', 'wb') as f:
    pickle.dump(vectorizer, f)

print("Placeholder pickle files created successfully")