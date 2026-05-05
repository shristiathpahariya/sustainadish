#!/usr/bin/env python3
"""
Quick script to check available Gemini models and test API connection.
Run this locally to see which models are available with your API key.
"""

import os
import google.generativeai as genai

# Get API key from environment
api_key = os.environ.get('GEMINI_API_KEY')

if not api_key:
    print("GEMINI_API_KEY not found in environment variables!")
    print("\nPlease set it first:")
    print("  export GEMINI_API_KEY=your-api-key-here")
    print("  # or create Backend/.env file with: GEMINI_API_KEY=your-key")
    exit(1)

print("API key found")

# Initialize
try:
    genai.configure(api_key=api_key)
    print("GenAI configured successfully")
except Exception as e:
    print(f"Failed to configure GenAI: {e}")
    exit(1)

# List available models
print("\nAvailable Gemini models (with generateContent support):")
print("-" * 60)

try:
    found_models = []
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            model_name = m.name
            print(f"  - {model_name}")
            found_models.append(model_name)

    print(f"\nFound {len(found_models)} usable models")

    # Test each model
    print("\nTesting models:")
    print("-" * 60)

    for model_name in found_models[:3]:  # Test first 3 models
        try:
            model = genai.GenerativeModel(model_name)
            print(f"  - {model_name} - Works!")
            break  # Stop at first working model
        except Exception as e:
            print(f"  - {model_name} - Failed: {str(e)[:60]}")

    print("\nRecommended: Use the first working model name in app.py")
    print(f"   Example: genai.GenerativeModel('{found_models[0]}')")

except Exception as e:
    print(f"Error listing models: {e}")

print("\n" + "=" * 60)
print("Next steps:")
print("1. Update Backend/app.py with the working model name")
print("2. Redeploy your ML service")
print("=" * 60)