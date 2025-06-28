#!/usr/bin/env bash
# build.sh - Put this file in your project root directory

set -o errexit  # Exit on any error

# Install Python dependencies
pip install -r requirements.txt

# Install WhiteNoise (add this to your requirements.txt instead)
pip install whitenoise

# Collect static files (this is where collectstatic goes)
python manage.py collectstatic --noinput

# Run database migrations
python manage.py migrate