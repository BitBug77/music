from django.shortcuts import redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.http import JsonResponse
from django.contrib.auth.models import User
import requests
import base64
import json
from .models import UserProfile, Action, Song, Recommendation, UserSimilarity
from django.views.decorators.csrf import csrf_exempt
import math
from collections import defaultdict
from django.db.models import Count
from .algorithms import recommend_songs_collaborative, recommend_songs_content_based
from django.views import View
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.views import APIView
from rest_framework.response import Response
from django.middleware.csrf import get_token

def csrf_token(request):
    return JsonResponse({"csrfToken": get_token(request)})

from django.contrib.auth import logout


@api_view(['POST'])
def login_view(request):
    """Handles user login"""
    try:
        if not request.body:
            return JsonResponse({'status': 'error', 'message': 'Empty request body'}, status=400)

        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON format'}, status=400)

    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    user = authenticate(username=username, password=password)

    if user is not None:
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        return JsonResponse({
            'status': 'success',
            'access': access_token,
            'refresh': refresh_token,
            'message': 'Login successful'
        })
    else:
        return JsonResponse({'status': 'error', 'message': 'Invalid credentials'}, status=400)


@csrf_exempt
@api_view(['POST'])
def signup_view(request):
    """Handles user signup"""
    try:
        data = json.loads(request.body)
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

    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    return JsonResponse({
        'status': 'success',
        'message': 'Account created successfully',
        'access': access_token,
        'refresh': refresh_token  # Send refresh token in response
    }, status=201)



def spotify_login(request):
    """Initiates Spotify OAuth login"""
    scope = 'user-read-private user-read-email user-top-read user-library-read'
    spotify_auth_url = 'https://accounts.spotify.com/authorize'
    redirect_uri = settings.SPOTIFY_REDIRECT_URI
    auth_url = f'{spotify_auth_url}?client_id={settings.SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri={redirect_uri}&scope={scope}'
    return redirect(auth_url)


def spotify_callback(request):
    """Handles the callback from Spotify after authentication"""
    code = request.GET.get('code')

    token_url = 'https://accounts.spotify.com/api/token'
    redirect_uri = settings.SPOTIFY_REDIRECT_URI

    client_creds = f"{settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}"
    client_creds_b64 = base64.b64encode(client_creds.encode()).decode()

    headers = {'Authorization': f'Basic {client_creds_b64}', 'Content-Type': 'application/x-www-form-urlencoded'}
    data = {'grant_type': 'authorization_code', 'code': code, 'redirect_uri': redirect_uri}

    response = requests.post(token_url, headers=headers, data=data)
    tokens = response.json()

    access_token = tokens.get('access_token')
    headers = {'Authorization': f'Bearer {access_token}'}
    user_info = requests.get('https://api.spotify.com/v1/me', headers=headers).json()

    spotify_id = user_info['id']
    email = user_info.get('email')

    if request.user.is_authenticated:
        user = request.user
    else:
        username = f"spotify_{spotify_id}"
        user, created = User.objects.get_or_create(username=username)
        if created and email:
            user.email = email
            user.save()

    profile, created = UserProfile.objects.get_or_create(user=user)
    profile.spotify_token = access_token
    profile.refresh_token = tokens.get('refresh_token')
    profile.spotify_id = spotify_id
    profile.save()

    login(request, user)
    return JsonResponse({'status': 'success', 'message': 'Spotify login successful', 'redirect_url': '/home'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def home(request):
    """Returns the home page data for the logged-in user"""
    user_profile = UserProfile.objects.get(user=request.user)
    profile_data = {
        'username': request.user.username,
        'spotify_id': user_profile.spotify_id,
        'spotify_token': user_profile.spotify_token,
    }
    return JsonResponse({'status': 'success', 'data': profile_data})

def get_spotify_token():
    """Fetches an access token using Client ID and Secret"""
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

    # Make the request to Spotify API
    response = requests.post(token_url, headers=headers, data=data)

    if response.status_code != 200:
        return None  # Return None if request fails

    # Extract the access token from the response
    token_info = response.json()
    access_token = token_info.get("access_token")

    return access_token  # Return only the access token


def get_access_token():
    """Get a valid Spotify access token, re-fetch if expired"""
    # Try getting a fresh token
    access_token = get_spotify_token()

    if not access_token:
        return None  # Return None if unable to get the initial token

    # Now, attempt to use the token (make a request to Spotify API with the access token)
    response = requests.get("https://api.spotify.com/v1/me", headers={"Authorization": f"Bearer {access_token}"})

    # Check if the access token has expired (401 Unauthorized)
    if response.status_code == 401:
        # If expired, fetch a new token
        access_token = get_spotify_token()

    return access_token  # Return the valid access token

# Call the get_access_token function to get a valid token
access_token = get_access_token()

if access_token:
    print("Access Token:", access_token)
else:
    print("Failed to obtain a new access token.")



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recommended_songs(request):
    """Returns recommended songs based on collaborative and content-based filtering"""
    # Call the recommendation functions from algorithms.py
    collaborative_recommendations = recommend_songs_collaborative(request.user)
    content_based_recommendations = recommend_songs_content_based(request.user)

    recommended_songs = list(set(collaborative_recommendations + content_based_recommendations))

    recommendations_data = [
        {
            'song': song.name,
            'artist': song.artist,
            'recommendation_source': 'Collaborative' if song in collaborative_recommendations else 'Content-Based'
        }
        for song in recommended_songs
    ]

    return JsonResponse({'status': 'success', 'recommendations': recommendations_data})

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_songs_by_popularity(request):
    """Fetch songs from Spotify API sorted by popularity, including album cover and track ID."""
    access_token = get_spotify_token()

    if not access_token:
        return JsonResponse({"status": "error", "message": "Failed to get Spotify token"}, status=500)

    # Spotify search API to fetch songs
    search_url = "https://api.spotify.com/v1/search"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    params = {
        "q": "*",         # Wildcard to fetch all songs
        "type": "track",  # Search for tracks
        "limit": 50       # Maximum allowed per request
    }

    response = requests.get(search_url, headers=headers, params=params)

    if response.status_code != 200:
        return JsonResponse({"status": "error", "message": "Failed to fetch songs"}, status=response.status_code)

    songs = response.json().get("tracks", {}).get("items", [])

    if not songs:
        return JsonResponse({"status": "error", "message": "No songs found"}, status=404)

    # Sort songs by popularity in descending order
    sorted_songs = sorted(songs, key=lambda x: x["popularity"], reverse=True)

    # Extract relevant song details including album cover and track ID
    song_list = [
        {
            "name": song["name"],
            "artist": song["artists"][0]["name"],
            "popularity": song["popularity"],
            "spotify_url": song["external_urls"]["spotify"],
            "album_cover": song["album"]["images"][0]["url"] if song["album"]["images"] else None,
            "spotifyTrackId": song["id"]  # Added track ID
        }
        for song in sorted_songs
    ]

    return JsonResponse({"status": "success", "songs": song_list})



@csrf_exempt
def logout_view(request):
    """Handles user logout"""
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'User not authenticated'}, status=401)

        logout(request)
        return JsonResponse({'status': 'success', 'message': 'Logged out successfully', 'redirect_url': '/login'}, status=200)

    return JsonResponse({'status': 'error', 'message': 'Invalid method'}, status=405)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_songs(request):
    """Search for songs using Spotify API and include album cover & track ID"""
    query = request.GET.get('q', '').strip()

    if not query:
        return JsonResponse({'status': 'error', 'message': 'Search query is required'}, status=400)

    access_token = get_spotify_token()  
    if not access_token:
        return JsonResponse({"status": "error", "message": "Failed to get Spotify token"}, status=500)

    search_url = "https://api.spotify.com/v1/search"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "q": query,
        "type": "track",
        "limit": 10
    }

    response = requests.get(search_url, headers=headers, params=params)
    
    if response.status_code != 200:
        return JsonResponse({"status": "error", "message": "Failed to fetch search results"}, status=response.status_code)

    results = response.json().get("tracks", {}).get("items", [])

    # Extract relevant data including album cover & track ID
    song_list = [
        {
            "track_id": song["id"],  # Spotify Track ID
            "name": song["name"],  
            "artist": song["artists"][0]["name"],  
            "album_cover": song["album"]["images"][0]["url"] if song["album"]["images"] else None,  # Album Cover URL
            "spotify_url": song["external_urls"]["spotify"]  
        }
        for song in results
    ]

    return JsonResponse({"status": "success", "songs": song_list})

class GetSongView(View):
    def get(self, request, id):
        access_token = get_spotify_token()
        headers = {"Authorization": f"Bearer {access_token}"}

        # Fetch song details
        song_url = f"https://api.spotify.com/v1/tracks/{id}"
        song_response = requests.get(song_url, headers=headers)

        if song_response.status_code != 200:
            return JsonResponse(
                {"error": f"Failed to fetch song details (Status Code: {song_response.status_code})"},
                status=song_response.status_code
            )

        try:
            song_data = song_response.json()
        except requests.exceptions.JSONDecodeError:
            return JsonResponse({"error": "Invalid response from Spotify API"}, status=500)

        # Format the response
        song_details = {
            "track_id": song_data["id"],
            "name": song_data["name"],
            "artist": song_data["artists"][0]["name"],
            "album": song_data["album"]["name"],
            "album_cover": song_data["album"]["images"][0]["url"] if song_data["album"]["images"] else "",
            "release_date": song_data["album"]["release_date"],
            "duration": song_data["duration_ms"],
            "popularity": song_data["popularity"],
            "spotify_url": song_data["external_urls"]["spotify"],
            "preview_url": song_data.get("preview_url", ""),
        }

        return JsonResponse(song_details, safe=False)
    
from datetime import datetime
from .models import Action, Song
import json
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_interaction(request):
    if request.method == 'POST':
        try:
            # Parse the incoming JSON data
            data = json.loads(request.body)
            print(data)
            track_id = data.get('track_id')  # Spotify track ID
            interaction_type = data.get('interaction_type')
            timestamp = data.get('timestamp', datetime.utcnow().isoformat())  # Use current timestamp if missing

            # Check for missing required fields
            if not track_id or not interaction_type:
                return JsonResponse({'error': 'Missing required fields'}, status=400)

            # Ensure the user is authenticated
            user = request.user if request.user.is_authenticated else None
            if not user:
                return JsonResponse({'error': 'Cannot find user, please log in'}, status=401)

            # Fetch the access token
            access_token = get_spotify_token()

            if not access_token:
                return JsonResponse({'error': 'Failed to authenticate with Spotify'}, status=500)

            # Fetch song details from Spotify API
            spotify_url = f"https://api.spotify.com/v1/tracks/{track_id}"
            headers = {
                "Authorization": f"Bearer {access_token}",  # Use the token retrieved
            }

            response = requests.get(spotify_url, headers=headers)
            if response.status_code != 200:
                return JsonResponse({'error': 'Failed to fetch song details from Spotify'}, status=500)

            track_data = response.json()

            # Extract song details from the Spotify response
            song_name = track_data['name']
            song_artist = track_data['artists'][0]['name']
            song_album = track_data['album']['name']
            song_duration = track_data['duration_ms'] / 1000  # Convert milliseconds to seconds

            # Create or get the song entry
            song, created = Song.objects.get_or_create(
                spotify_id=track_id,
                defaults={
                    'name': song_name,
                    'artist': song_artist,
                    'album': song_album,
                    'duration': song_duration,
                }
            )

            # Create the action entry
            action = Action.objects.create(
                user=user,
                song=song,  # Pass the Song instance here
                action_type=interaction_type,
                timestamp=timestamp
            )

            # Return success response
            return JsonResponse({'message': 'Interaction logged successfully'})

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    # Handle invalid request methods
    return JsonResponse({'error': 'Invalid request method'}, status=405)



@csrf_exempt
def session(request):
    """Debug view to check session status"""
    return JsonResponse({
        'session_key': request.session.session_key,
        'user_authenticated': request.user.is_authenticated,
        'username': request.user.username if request.user.is_authenticated else None,
        'session_data': dict(request.session)
    })

