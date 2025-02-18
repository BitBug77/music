from django.shortcuts import redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.http import JsonResponse
from django.contrib.auth.models import User
import requests
import base64
import json
from .models import UserProfile
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt  # Disable CSRF only for development (not recommended for production APIs)
def login_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)  # Parse JSON request body
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format'}, status=400)

        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return JsonResponse({'status': 'error', 'message': 'Username and password are required'}, status=400)

        user = authenticate(username=username, password=password)

        if user is not None:
            login(request, user)
            return JsonResponse({'status': 'success', 'redirect_url': '/home'}, status=200)
        else:
            return JsonResponse({'status': 'error', 'message': 'Invalid credentials'}, status=400)

    return JsonResponse({'status': 'error', 'message': 'Invalid method'}, status=405)



@csrf_exempt  # Disables CSRF protection for this view
def signup_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)  # Parse JSON request body
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format'}, status=400)

        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        password_confirmation = data.get('password_confirmation', '').strip()

        if not username or not password or not password_confirmation:
            return JsonResponse({'status': 'error', 'message': 'All fields are required'}, status=400)

        if password != password_confirmation:
            return JsonResponse({'status': 'error', 'message': 'Passwords do not match'}, status=400)

        if User.objects.filter(username=username).exists():
            return JsonResponse({'status': 'error', 'message': 'Username already taken'}, status=400)

        user = User.objects.create_user(username=username, password=password)
        user.save()
        login(request, user)

        return JsonResponse({'status': 'success', 'message': 'Account created successfully'}, status=201)

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)



def spotify_login(request):
    # Spotify authorization URL
    scope = 'user-read-private user-read-email user-top-read user-library-read'
    spotify_auth_url = 'https://accounts.spotify.com/authorize'
    redirect_uri = settings.SPOTIFY_REDIRECT_URI
    
    auth_url = f'{spotify_auth_url}?client_id={settings.SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri={redirect_uri}&scope={scope}'
    return redirect(auth_url)

def spotify_callback(request):
    code = request.GET.get('code')
    
    # Exchange code for access token
    token_url = 'https://accounts.spotify.com/api/token'
    redirect_uri = settings.SPOTIFY_REDIRECT_URI
    
    # Encode client ID and secret
    client_creds = f"{settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}"
    client_creds_b64 = base64.b64encode(client_creds.encode()).decode()
    
    headers = {
        'Authorization': f'Basic {client_creds_b64}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirect_uri
    }
    
    # Get tokens from Spotify
    response = requests.post(token_url, headers=headers, data=data)
    tokens = response.json()
    
    # Get user info from Spotify
    access_token = tokens.get('access_token')
    headers = {'Authorization': f'Bearer {access_token}'}
    user_info = requests.get('https://api.spotify.com/v1/me', headers=headers).json()
    
    # Create or update user
    spotify_id = user_info['id']
    email = user_info.get('email')
    
    # Create or get user
    if request.user.is_authenticated:
        user = request.user
    else:
        # Create new user if doesn't exist
        username = f"spotify_{spotify_id}"
        user, created = User.objects.get_or_create(username=username)
        if created and email:
            user.email = email
            user.save()
    
    # Update or create user profile
    profile, created = UserProfile.objects.get_or_create(user=user)
    profile.spotify_token = access_token
    profile.refresh_token = tokens.get('refresh_token')
    profile.spotify_id = spotify_id
    profile.save()
    
    login(request, user)
    
    # Return success message
    return JsonResponse({'status': 'success', 'message': 'Spotify login successful', 'redirect_url': '/home'})

@login_required
def home(request):
    # You might want to send some data back to the frontend
    user_profile = UserProfile.objects.get(user=request.user)
    profile_data = {
        'username': request.user.username,
        'spotify_id': user_profile.spotify_id,
        'spotify_token': user_profile.spotify_token,
    }
    
    # Send the user data as JSON
    return JsonResponse({'status': 'success', 'data': profile_data})



def get_spotify_token():
    """Fetch an access token using Client ID and Secret."""
    client_id = settings.SPOTIFY_CLIENT_ID
    client_secret = settings.SPOTIFY_CLIENT_SECRET
    token_url = "https://accounts.spotify.com/api/token"
    
    # Encode client credentials
    client_creds = f"{client_id}:{client_secret}"
    client_creds_b64 = base64.b64encode(client_creds.encode()).decode()

    headers = {
        "Authorization": f"Basic {client_creds_b64}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    data = {"grant_type": "client_credentials"}
    
    response = requests.post(token_url, headers=headers, data=data)
    token_info = response.json()
    
    return token_info.get("access_token"), token_info.get("refresh_token")


def refresh_spotify_token(refresh_token):
    """Refresh the access token using the refresh token."""
    client_id = settings.SPOTIFY_CLIENT_ID
    client_secret = settings.SPOTIFY_CLIENT_SECRET
    token_url = "https://accounts.spotify.com/api/token"
    
    # Encode client credentials
    client_creds = f"{client_id}:{client_secret}"
    client_creds_b64 = base64.b64encode(client_creds.encode()).decode()

    headers = {
        "Authorization": f"Basic {client_creds_b64}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token
    }
    
    response = requests.post(token_url, headers=headers, data=data)
    
    if response.status_code != 200:
        return None
    
    token_info = response.json()
    return token_info.get("access_token")


def popularity(request):
    """Fetch songs from Spotify API sorted by popularity."""
    access_token, refresh_token = get_spotify_token()
    
    if not access_token:
        return JsonResponse({"status": "error", "message": "Failed to get Spotify token"}, status=500)

    # Spotify search API (searching for all songs with wildcard `*`)
    search_url = "https://api.spotify.com/v1/search"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    params = {
        "q": "*",         # Get all songs
        "type": "track",  # Search for tracks
        "limit": 50       # Max limit per request (Spotify allows max 50 per request)
    }

    response = requests.get(search_url, headers=headers, params=params)

    if response.status_code == 401:  # Token expired, try to refresh it
        new_access_token = refresh_spotify_token(refresh_token)
        if not new_access_token:
            return JsonResponse({"status": "error", "message": "Failed to refresh Spotify token"}, status=500)
        
        headers["Authorization"] = f"Bearer {new_access_token}"
        response = requests.get(search_url, headers=headers, params=params)

    if response.status_code != 200:
        return JsonResponse({"status": "error", "message": "Failed to fetch songs"}, status=response.status_code)

    songs = response.json().get("tracks", {}).get("items", [])

    # Sort songs by popularity (descending)
    sorted_songs = sorted(songs, key=lambda x: x["popularity"], reverse=True)

    # Return only relevant fields
    song_list = [
        {
            "name": song["name"],
            "artist": song["artists"][0]["name"],
            "popularity": song["popularity"],
            "spotify_url": song["external_urls"]["spotify"],
            "album_image": song["album"]["images"][0]["url"]
        }
        for song in sorted_songs
    ]

    return JsonResponse({"status": "success", "songs": song_list})