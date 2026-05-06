import argparse
import json
import os
import pickle
import re
import string
from datetime import datetime

import numpy as np
import pandas as pd
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer


# Keep this name at module top-level so the pickled vectorizer references __main__.recipe_tokenizer.
# app.py defines recipe_tokenizer in __main__ as well, so unpickling works there too.
def recipe_tokenizer(sentence: str):
    if not isinstance(sentence, str):
        sentence = "" if sentence is None else str(sentence)

    for punctuation_mark in string.punctuation:
        sentence = sentence.replace(punctuation_mark, "").lower()

    listofwords = sentence.split(" ")
    listofstemmed_words = []

    # Minimal tokenizer for speed and portability (no NLTK downloads during training)
    for word in listofwords:
        w = word.strip()
        if w:
            listofstemmed_words.append(w)

    return listofstemmed_words


def _ingredients_to_string(v):
    if v is None:
        return ""
    if isinstance(v, str):
        s = v.strip()
        # If it's JSON, try to parse
        if (s.startswith("[") and s.endswith("]")) or (s.startswith("{") and s.endswith("}")):
            try:
                parsed = json.loads(s)
                if isinstance(parsed, list):
                    return ", ".join([str(x).strip() for x in parsed if str(x).strip()])
                return str(parsed)
            except Exception:
                return s
        return s
    if isinstance(v, list):
        return ", ".join([str(x).strip() for x in v if str(x).strip()])
    try:
        return json.dumps(v)
    except Exception:
        return str(v)


def train_from_csv(csv_path: str, outdir: str, max_features: int = 2000, limit: int | None = None):
    df = pd.read_csv(csv_path)

    # Expect columns written by export-training-data.js
    # recipeId,recipeKey,title,ingredients,instructions,authorId,likes,createdAt,updatedAt
    if "title" not in df.columns or "ingredients" not in df.columns or "instructions" not in df.columns:
        raise ValueError("CSV missing required columns: title, ingredients, instructions")

    if limit is not None and limit > 0:
        df = df.head(int(limit))

    sampled_data = pd.DataFrame(
        {
            "Title": df["title"].fillna("").astype(str),
            "Ingredients": df["ingredients"].apply(_ingredients_to_string),
            "Instructions": df["instructions"].fillna("").astype(str),
        }
    )

    # Text for training is ingredients + title + instructions (simple and fast)
    text_series = (
        sampled_data["Ingredients"].fillna("").astype(str)
        + " "
        + sampled_data["Title"].fillna("").astype(str)
        + " "
        + sampled_data["Instructions"].fillna("").astype(str)
    )

    vectorizer = TfidfVectorizer(
        tokenizer=recipe_tokenizer,
        lowercase=True,
        max_features=max_features,
        min_df=1,
        max_df=0.95,
    )

    tfidf = vectorizer.fit_transform(text_series)
    tfidf = tfidf.astype(np.float32)

    # app.py expects combined_embeddings to include 100 trailing dims for word2vec.
    zeros_w2v = sparse.csr_matrix((tfidf.shape[0], 100), dtype=np.float32)
    combined_embeddings = sparse.hstack([tfidf * np.float32(0.2), zeros_w2v], format="csr")

    os.makedirs(outdir, exist_ok=True)

    with open(os.path.join(outdir, "tfidf_vectorizer.pkl"), "wb") as f:
        pickle.dump(vectorizer, f, protocol=4)

    with open(os.path.join(outdir, "combined_embeddings.pkl"), "wb") as f:
        pickle.dump(combined_embeddings, f, protocol=4)

    with open(os.path.join(outdir, "sampled_data.pkl"), "wb") as f:
        pickle.dump(sampled_data, f, protocol=4)

    return {
        "rows": int(sampled_data.shape[0]),
        "tfidf_features": int(tfidf.shape[1]),
        "combined_features": int(combined_embeddings.shape[1]),
        "outdir": outdir,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True)
    parser.add_argument("--outdir", required=True)
    parser.add_argument("--max_features", type=int, default=2000)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    limit = args.limit if args.limit and args.limit > 0 else None

    started = datetime.utcnow()
    result = train_from_csv(args.csv, args.outdir, max_features=args.max_features, limit=limit)
    elapsed = (datetime.utcnow() - started).total_seconds()

    print(
        json.dumps(
            {
                "ok": True,
                "elapsedSeconds": elapsed,
                "result": result,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

