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
from .models import FriendRequest
from django.middleware.csrf import get_token
from .models import FriendRequest
def csrf_token(request):
    return JsonResponse({"csrfToken": get_token(request)})

from django.contrib.auth import logout

@csrf_exempt
def login_view(request):
    """Handles user login"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
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


@csrf_exempt
def signup_view(request):
    """Handles user signup"""
    if request.method == 'POST':
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
        login(request, user)

        return JsonResponse({'status': 'success', 'message': 'Account created successfully'}, status=201)

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)


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


@login_required
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


def refresh_spotify_token(refresh_token):
    """Refreshes the access token using the refresh token"""
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

    # Make the request to Spotify API to refresh the token
    response = requests.post(token_url, headers=headers, data=data)

    if response.status_code != 200:
        return None  # If refreshing fails, return None

    # Extract the new access token from the response
    token_info = response.json()
    access_token = token_info.get("access_token")

    return access_token


@login_required
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


@login_required
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


@login_required
def recommend_friends(request):
    """Recommend friends based on similar music taste."""
    user = request.user  # Get the logged-in user

    # Get similar users (sorted by similarity score)
    similar_users = (
        UserSimilarity.objects.filter(user1=user)
        .order_by("-similarity_score")
        .values_list("user2", "similarity_score")
    )

    # Exclude already connected friends (assuming a Friend model exists)
    friends = set()  # Replace this with actual friend list if available

    recommended_friends = [
        {
            "user_id": user_id,
            "username": User.objects.get(id=user_id).username,
            "similarity_score": score,
        }
        for user_id, score in similar_users if user_id not in friends
    ]

    return JsonResponse({"status": "success", "recommended_friends": recommended_friends})



@login_required
@csrf_exempt
def send_friend_request(request, user_id):
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)

    sender = request.user  # Logged-in user
    try:
        receiver = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)

    if sender == receiver:
        return JsonResponse({"status": "error", "message": "You cannot send a friend request to yourself"}, status=400)

    # Check if a request already exists
    existing_request = FriendRequest.objects.filter(sender=sender, receiver=receiver, status="pending").exists()
    if existing_request:
        return JsonResponse({"status": "error", "message": "Friend request already sent"}, status=400)

    FriendRequest.objects.create(sender=sender, receiver=receiver)

    return JsonResponse({"status": "success", "message": "Friend request sent successfully"})

# ACCEPT OR REJECT FRIEND REQUEST
@csrf_exempt
@login_required
def respond_to_friend_request(request, request_id, response):
    """Respond to a friend request."""
    if request.method == "POST":
        try:
            friend_request = FriendRequest.objects.get(id=request_id)
            if response == "accept":
                # Logic to accept the request (e.g., create a friendship)
                friend_request.status = "accepted"
                friend_request.save()
                return JsonResponse({"status": "success", "message": "Friend request accepted"})
            elif response == "reject":
                # Logic to reject the request
                friend_request.status = "rejected"
                friend_request.save()
                return JsonResponse({"status": "success", "message": "Friend request rejected"})
            else:
                return JsonResponse({"status": "error", "message": "Invalid response"}, status=400)
        except FriendRequest.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Friend request not found"}, status=404)

@login_required
def search_user(request, username):
    """Search for a user by username and return similar usernames with user IDs."""
    try:
        # Exact match for the username
        exact_match_user = User.objects.get(username=username)

        # Fetch similar users (case-insensitive match)
        similar_users = User.objects.filter(username__icontains=username).exclude(id=exact_match_user.id)
        
        # Prepare the data to send back to the frontend
        similar_user_data = [
            {
                "user_id": user.id,
                "username": user.username
            }
            for user in similar_users
        ]
        
        # Include the exact match user as well in the response
        return JsonResponse({
            "status": "success",
            "exact_match": {
                "user_id": exact_match_user.id,
                "username": exact_match_user.username
            },
            "similar_users": similar_user_data
        })
    
    except User.DoesNotExist:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)