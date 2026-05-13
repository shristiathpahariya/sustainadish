import argparse
import json
import os
import pickle
import re
import shutil
import string
from datetime import datetime
import numpy as np
import pandas as pd
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer

# Download NLTK data if needed
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    try:
        nltk.download('punkt')
    except:
        pass

# For NLTK 3.8+ (Python 3.13), download punkt_tab instead
try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    try:
        nltk.download('punkt_tab')
    except:
        pass

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize


ARTIFACTS = ["combined_embeddings.pkl", "sampled_data.pkl", "tfidf_vectorizer.pkl"]

# Ingredient extraction word lists (same as app.py)
MEASUREMENT_UNITS = {
    'teaspoon', 'tsp', 'tablespoon', 'tbsp', 'cup', 'c', 'quart', 'qt',
    'liter', 'l', 'milliliter', 'ml', 'gallon', 'g', 'pint', 'pt', 'fluid', 'fl',
    'ounce', 'ounces', 'oz', 'pound', 'lb', 'pounds', 'gram', 'grams', 'g', 'kilogram', 'kg', 'milligram', 'mg',
    'piece', 'pieces', 'slice', 'slices', 'clove', 'cloves', 'head', 'heads',
    'bunch', 'bunches', 'sprig', 'sprigs', 'leaf', 'leaves', 'fillet', 'fillets', 'serving', 'servings'
}

PREPARATION_WORDS = {
    'chopped', 'sliced', 'diced', 'minced', 'crushed', 'shredded', 'ground',
    'grated', 'peeled', 'cored', 'seeded', 'boned', 'skinless', 'boneless',
    'fresh', 'dried', 'frozen', 'canned', 'cooked', 'uncooked', 'raw', 'roasted',
    'finely', 'roughly', 'lightly', 'heavily', 'thinly', 'thickly', 'coarsely',
    'warmed', 'lined', 'bought', 'store', 'pickled', 'cured', 'kosher', 'homemade'
}

NON_INGREDIENT_WORDS = {
    'large', 'small', 'medium', 'whole', 'half', 'quarter', 'third', 'piece',
    'about', 'with', 'without', 'or', 'and', 'for', 'to', 'use', 'using', 'like',
    'more', 'less', 'as', 'if', 'when', 'then', 'well', 'good', 'best', 'better',
    'optional', 'plus', 'minus', 'add', 'added', 'into', 'divide', 'divided',
    'red', 'black', 'green', 'yellow', 'purple', 'orange', 'pink', 'brown', 'gray', 'white',
    'powder', 'cube', 'cubes', 'stick', 'sticks', 'dip', 'dips', 'sauce', 'sauces',
    'broth', 'stock', 'liquid', 'mixture', 'batter', 'dough', 'past', 'puree',
    'soup', 'salad', 'dish', 'meal', 'course', 'bell', 'hot', 'cold', 'warm',
    'make', 'makes', 'made', 'prepare', 'prepared', 'recipe', 'recipes',
}

ENGLISH_STOP_WORDS = set(stopwords.words('english'))


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

def ingredient_tokenizer(text):
    """
    Enhanced tokenizer for extracting real ingredient words.
    Filters out measurements, numbers, stopwords, and non-ingredient words.
    """
    if not isinstance(text, str):
        return []

    text = text.lower()

    # Remove punctuation
    for punctuation_mark in string.punctuation:
        text = text.replace(punctuation_mark, ' ')

    # Replace numbers and fractions with placeholder
    text = re.sub(r'\d+[\d\s/-]*', ' ', text)
    # Remove remaining numbers
    text = re.sub(r'\d+', ' ', text)

    # Tokenize
    tokens = word_tokenize(text)

    # Filter out non-ingredient words
    ingredient_words = []
    for token in tokens:
        token = token.strip()

        # Skip empty tokens
        if not token:
            continue

        # Skip if it's a measurement unit
        if token in MEASUREMENT_UNITS or token.lower() in MEASUREMENT_UNITS:
            continue

        # Skip if it's a preparation word
        if token in PREPARATION_WORDS or token.lower() in PREPARATION_WORDS:
            continue

        # Skip if it's a non-ingredient word
        if token in NON_INGREDIENT_WORDS or token.lower() in NON_INGREDIENT_WORDS:
            continue

        # Skip if it's a stopword
        if token in ENGLISH_STOP_WORDS or token.lower() in ENGLISH_STOP_WORDS:
            continue

        # Skip single letters
        if len(token) == 1:
            continue

        # Skip if it's too short (less than 2 chars)
        if len(token) < 2:
            continue

        # Skip if all characters are digits (safety check)
        if token.isdigit():
            continue

        ingredient_words.append(token)

    return ingredient_words


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


def _semver_normalize(v: str) -> str:
    raw = (v or "").strip()
    if raw.lower().startswith("v"):
        raw = raw[1:]
    parts = raw.split(".")
    if len(parts) != 3 or not all(p.isdigit() for p in parts):
        raise ValueError('Invalid version. Expected "MAJOR.MINOR.PATCH" (optionally prefixed with v).')
    return raw


def _ensure_dir(p: str):
    os.makedirs(p, exist_ok=True)


def _backup_input(input_dir: str, backup_root: str) -> str | None:
    if not os.path.isdir(input_dir):
        return None

    existing = [f for f in ARTIFACTS if os.path.exists(os.path.join(input_dir, f))]
    if not existing:
        return None

    ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    backup_dir = os.path.join(backup_root, f"input-backup-{ts}")
    _ensure_dir(backup_dir)

    for name in existing:
        shutil.copy2(os.path.join(input_dir, name), os.path.join(backup_dir, name))

    return backup_dir


def _try_symlink_or_copy(src: str, dst: str) -> dict:
    # Windows symlink may require admin/dev mode; fall back to copy.
    result = {"dst": dst, "mode": None}

    if os.path.lexists(dst):
        try:
            if os.path.islink(dst) or os.path.isfile(dst):
                os.remove(dst)
            else:
                # directory/junction
                shutil.rmtree(dst)
        except Exception:
            pass

    try:
        os.symlink(src, dst)
        result["mode"] = "symlink"
        return result
    except Exception:
        pass

    shutil.copy2(src, dst)
    result["mode"] = "copy"
    return result


def train_from_csv(csv_path: str, outdir: str, max_features: int = 2000, limit: int | None = None):
    df = pd.read_csv(csv_path)

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

    zeros_w2v = sparse.csr_matrix((tfidf.shape[0], 100), dtype=np.float32)
    combined_embeddings = sparse.hstack([tfidf * np.float32(0.2), zeros_w2v], format="csr")

    _ensure_dir(outdir)

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
    parser.add_argument("--csv", required=True, help="CSV generated by export-training-data")
    parser.add_argument("--version", required=True, help="Model version, e.g. 1.0.3")
    parser.add_argument("--modelId", default="recipe-recommender")
    parser.add_argument("--max_features", type=int, default=2000)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--versions_root", default="")
    parser.add_argument("--input_dir", default="")
    parser.add_argument("--backup_root", default="")
    parser.add_argument("--update_input", default="true", help="true|false")
    args = parser.parse_args()

    backend_root = os.path.dirname(os.path.abspath(__file__))
    versions_root = (
        os.path.abspath(args.versions_root)
        if args.versions_root
        else os.path.join(backend_root, "ml_versions")
    )
    input_dir = os.path.abspath(args.input_dir) if args.input_dir else os.path.join(backend_root, "input")
    backup_root = (
        os.path.abspath(args.backup_root)
        if args.backup_root
        else os.path.join(backend_root, "ml_versions", "_backups")
    )

    version = _semver_normalize(args.version)
    model_id = (args.modelId or "recipe-recommender").strip()
    version_dir = os.path.join(versions_root, model_id, f"v{version}")

    limit = args.limit if args.limit and args.limit > 0 else None
    update_input = str(args.update_input).strip().lower() != "false"

    started = datetime.utcnow()

    backup_dir = _backup_input(input_dir, backup_root) if update_input else None
    result = train_from_csv(args.csv, version_dir, max_features=int(args.max_features), limit=limit)

    link_results = []
    if update_input:
        _ensure_dir(input_dir)
        for name in ARTIFACTS:
            src = os.path.join(version_dir, name)
            dst = os.path.join(input_dir, name)
            link_results.append(_try_symlink_or_copy(src, dst))

    elapsed = (datetime.utcnow() - started).total_seconds()

    print(
        json.dumps(
            {
                "ok": True,
                "elapsedSeconds": elapsed,
                "modelId": model_id,
                "version": version,
                "versionDir": version_dir,
                "backupDir": backup_dir,
                "inputDir": input_dir,
                "inputUpdate": update_input,
                "inputArtifacts": link_results,
                "result": result,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

