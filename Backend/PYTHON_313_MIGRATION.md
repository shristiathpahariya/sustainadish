# Python 3.13 Migration Guide

## Overview
This document explains the changes made to make the backend compatible with Python 3.13.

## What Changed

### 1. Updated Requirements (requirements.txt)

#### Old Versions (Python 3.9-3.12 compatible):
```
numpy==1.26.4
pandas==2.2.0
scikit-learn==1.5.0
google-generativeai==0.8.3
```

#### New Versions (Python 3.13 compatible):
```
numpy>=2.1.0                    # Required for Python 3.13
pandas>=2.2.3                   # Python 3.13 support added in 2.2.3
scikit-learn>=1.5.2             # Python 3.13 support added in 1.5.2
google-genai>=0.3.0            # NEW SDK with Python 3.13 support
```

### 2. API Migration: google-generativeai → google-genai

The old `google-generativeai` SDK is deprecated and **does not support Python 3.13**. We've migrated to the new `google-genai` SDK.

#### Import Changes
```python
# OLD (deprecated, not Python 3.13 compatible)
import google.generativeai as genai

# NEW (Python 3.13 compatible)
from google import genai
from google.genai import types
```

#### Client Initialization
```python
# OLD
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel(model_name)

# NEW
genai_client = genai.Client(api_key=GEMINI_API_KEY)
# No explicit model initialization needed
```

#### Model Listing
```python
# OLD
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        model_name = m.name

# NEW
for m in genai_client.models.list():
    model_name = getattr(m, 'name', str(m))
```

#### Content Generation
```python
# OLD
response = model.generate_content(
    prompt,
    generation_config={
        "temperature": 0.3,
        "max_output_tokens": 32768,
        "top_p": 0.8,
    }
)
raw_response = response.text if response.text else ""

# NEW
response = genai_client.models.generate_content(
    model=model_name,
    contents=prompt,
    config=types.GenerateContentConfig(
        temperature=0.3,
        max_output_tokens=32768,
        top_p=0.8,
    )
)
raw_response = response.text if response.text else ""
```

## Key Differences

1. **Client-based architecture**: The new SDK uses a client object instead of a module-level API
2. **Explicit model parameter**: The model name is now required in each `generate_content` call
3. **Config object**: Configuration uses `types.GenerateContentConfig` instead of a dict
4. **Explicit imports**: Need to import `types` module for configuration

## Installation Instructions

### Local Development
```bash
# Install the updated requirements
cd Backend
pip install -r requirements.txt

# Start the server
python app.py
```

### Production (Render/cloud)
The updated requirements.txt will automatically use the new versions when deployed.

## Troubleshooting

### Issue: "No module named 'google.generativeai'"
**Solution**: The old package is no longer used. Ensure you've installed the new requirements.txt with `google-genai`.

### Issue: "scikit-learn 1.5.0 is not compatible with Python 3.13"
**Solution**: Update to scikit-learn 1.5.2 or higher as specified in requirements.txt.

### Issue: ImportError for types module
**Solution**: Ensure you have the correct import: `from google.genai import types`

### Issue: "numpy version too old"
**Solution**: NumPy 2.x is required for Python 3.13 compatibility. The requirements.txt specifies `numpy>=2.1.0`.

## Compatibility Notes

- ✅ Python 3.11: Fully supported
- ✅ Python 3.12: Fully supported
- ✅ Python 3.13: Fully supported (primary target)
- ⚠️ Python 3.14: Supported by NumPy 2.4.4+, but not extensively tested

## Testing

After migration, test the following endpoints to ensure they work correctly:

1. `/recommend` - Recipe recommendation
2. `/ai-modify-recipe` - AI-powered recipe modification
3. `/ingredients/suggest` - Ingredient autocomplete
4. `/health` - Health check

## Rollback Procedure

If you encounter issues and need to rollback:

1. Use Python 3.12 or earlier
2. Install the old requirements:
   ```bash
   pip install -r requirements_old.txt  # You'll need to create this backup
   ```
3. Revert the `app.py` changes to use the old SDK

## References

- [New Google Gen AI SDK Documentation](https://googleapis.github.io/python-genai/index.html)
- [Scikit-learn Python 3.13 Support Issue](https://github.com/scikit-learn/scikit-learn/issues/29870)
- [NumPy 2.1.0 Release Notes](https://github.com/numpy/numpy/releases/tag/v2.1.0)
- [Pandas Python 3.13 Support](https://github.com/pandas-dev/pandas/issues/59978)