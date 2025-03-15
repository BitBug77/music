from django.shortcuts import redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.http import JsonResponse
from django.contrib.auth.models import User
import requests
import base64
import jwt
import json
from .models import UserProfile, Action, Song, Recommendation, UserSimilarity, Playlist, UserMusic, PlaylistSong
from django.views.decorators.csrf import csrf_exempt
import math
from collections import defaultdict
from django.db.models import Count
from .algorithms import recommend_songs_collaborative, recommend_songs_content_based, update_preferences_based_on_actions
from .models import FriendRequest
from django.views import View
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.views import APIView
from rest_framework.response import Response
from django.middleware.csrf import get_token
from .models import FriendRequest
from django.db import connection
from django.shortcuts import get_object_or_404
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from .serializer import  LikedSongSerializer, PlaylistSerializer, PlaylistSongSerializer , SongSerializer
from django.db.models import Q
from .models import EsewaPayment
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import time 
from django.utils import timezone
from django.db.models import F


def check_db(request):
    db_name = connection.settings_dict["NAME"]
    return JsonResponse({"database_name": db_name})
def csrf_token(request):
    return JsonResponse({"csrfToken": get_token(request)})

from django.contrib.auth import logout


@api_view(['POST'])
def login_view(request):
    """Handles user login"""
   
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format'}, status=400)
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
    """Handles user signup and initial profile creation"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format'}, status=400)
        
        # Extract basic user information
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        password_confirmation = data.get('password_confirmation', '').strip()
        email = data.get('email', '').strip()
        
        # Extract profile information
        name = data.get('name', '').strip()
        pronoun = data.get('pronoun', '').strip()
        gender = data.get('gender', '').strip()
        bio = data.get('bio', '').strip()
        
        # Validate required fields
        if not username or not password or not password_confirmation:
            return JsonResponse({'status': 'error', 'message': 'Username and password are required'}, status=400)
        
        # Check if passwords match
        if password != password_confirmation:
            return JsonResponse({'status': 'error', 'message': 'Passwords do not match'}, status=400)
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            return JsonResponse({'status': 'error', 'message': 'Username already taken'}, status=400)
        
        # Create user
        user = User.objects.create_user(username=username, email=email, password=password)
        user.save()
        
        # Create or update user profile
        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.name = name
        profile.pronoun = pronoun
        profile.gender = gender
        profile.bio = bio
        profile.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        return JsonResponse({
            'status': 'success',
            'message': 'Account created successfully',
            'access': access_token,
            'refresh': refresh_token
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

from datetime import datetime, timedelta

# Cache for the access token
access_token_cache = {
    'token': None,
    'expires_at': datetime.now()
}

def get_spotify_token():
    global access_token_cache

    # Check if the token is already cached and still valid
    if access_token_cache['token'] and access_token_cache['expires_at'] > datetime.now():
        return access_token_cache['token']

    # Token has expired or not available, get a new one using client credentials flow
    auth_response = requests.post(
        'https://accounts.spotify.com/api/token',
        data={
            'grant_type': 'client_credentials',
        },
        auth=(settings.SPOTIFY_CLIENT_ID, settings.SPOTIFY_CLIENT_SECRET)
    )

    if auth_response.status_code == 200:
        auth_data = auth_response.json()
        access_token = auth_data['access_token']
        expires_in = auth_data['expires_in']

        # Update the cache
        access_token_cache['token'] = access_token
        access_token_cache['expires_at'] = datetime.now() + timedelta(seconds=expires_in)

        return access_token
    else:
        return None  # Return None in case of failure to get the token
# Example CSRF exempt view using the token
@csrf_exempt
def spotify_search(request):
    """
    Example of a CSRF exempt view that uses the Spotify token
    """
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    query = request.GET.get('q')
    if not query:
        return JsonResponse({"error": "Search query required"}, status=400)
    
    token = get_spotify_token()
    if not token:
        return JsonResponse({"error": "Failed to get Spotify token"}, status=500)
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(
            "https://api.spotify.com/v1/search",
            headers=headers,
            params={"q": query, "type": "track", "limit": 10}
        )
        response.raise_for_status()
        return JsonResponse(response.json())
    
    except requests.RequestException as e:
        return JsonResponse({"error": str(e)}, status=400)


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


@api_view(['GET'])
@permission_classes([AllowAny])
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


@api_view(['POST'])
def logout_view(request):
    """Handles user logout"""

    # Check if the user is authenticated
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'User not authenticated'}, status=401)

    # Perform logout
    logout(request)
    return JsonResponse({'status': 'success', 'message': 'Logged out successfully'}, status=200)


@api_view(['POST'])

@permission_classes([IsAuthenticated])
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_friend_request(request):
    """Send a friend request to another user using username or user_id in request body"""
    
    # Get user identifier from request body
    user_id = request.data.get('user_id')
    username = request.data.get('username')
    
    if not user_id and not username:
        return JsonResponse({"status": "error", "message": "Either user_id or username is required"}, status=400)
    
    sender = request.user  # Logged-in user
    
    try:
        # Find the receiver by either ID or username
        if user_id:
            receiver = User.objects.get(id=user_id)
        else:
            receiver = User.objects.get(username=username)
            
    except User.DoesNotExist:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)
    
    if sender == receiver:
        return JsonResponse({"status": "error", "message": "You cannot send a friend request to yourself"}, status=400)
    
    # Check if a request already exists
    existing_request = FriendRequest.objects.filter(
        sender=sender, 
        receiver=receiver,
        status="pending"
    ).exists()
    
    if existing_request:
        return JsonResponse({"status": "error", "message": "Friend request already sent"}, status=400)
    
    # Check if already friends
    already_friends = FriendRequest.objects.filter(
        sender=sender, 
        receiver=receiver,
        status="accepted"
    ).exists() or FriendRequest.objects.filter(
        sender=receiver, 
        receiver=sender,
        status="accepted"
    ).exists()
    
    if already_friends:
        return JsonResponse({"status": "error", "message": "You are already friends with this user"}, status=400)
    
    FriendRequest.objects.create(sender=sender, receiver=receiver)
    
    return JsonResponse({
        "status": "success", 
        "message": "Friend request sent successfully",
        "request_details": {
            "receiver": {
                "id": receiver.id,
                "username": receiver.username
            }
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_friend_request(request):
    """Respond to a friend request (accept or reject)"""
    # Get data from request body instead of URL parameters
    request_id = request.data.get('requestId')
    action = request.data.get('action')
    print(request.data)
    
    if not request_id or not action:
        return JsonResponse({"status": "error", "message": "Missing request_id or action"}, status=400)
    
    try:
        # Only allow users to respond to requests they've received
        friend_request = FriendRequest.objects.get(
            id=request_id,
            receiver=request.user  # Ensure the logged-in user is the receiver
        )
        
        if action == "accept":
            friend_request.status = "accepted"
            friend_request.save()
            return JsonResponse({"status": "success", "message": "Friend request accepted"})
        elif action == "decline":
            friend_request.status = "rejected"
            friend_request.save()
            return JsonResponse({"status": "success", "message": "Friend request rejected"})
        else:
            return JsonResponse({"status": "error", "message": "Invalid action. Use 'accept' or 'reject'"}, status=400)
    
    except FriendRequest.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Friend request not found or you don't have permission"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_friend_requests(request):
    """Get all friend requests for the current user"""
    # Get received requests
    received_requests = FriendRequest.objects.filter(receiver=request.user)
    # Get sent requests
    sent_requests = FriendRequest.objects.filter(sender=request.user)
    
    # Serialize the requests
    received_data = []
    for req in received_requests:
        received_data.append({
            "id": req.id,
            "sender": {
                "id": req.sender.id,
                "username": req.sender.username,
                # Add other user fields as needed
            },
            "status": req.status,
            "timestamp": req.timestamp
        })
    
    sent_data = []
    for req in sent_requests:
        sent_data.append({
            "id": req.id,
            "receiver": {
                "id": req.receiver.id,
                "username": req.receiver.username,
                # Add other user fields as needed
            },
            "status": req.status,
            "timestamp": req.timestamp
        })
    
    return JsonResponse({
        "status": "success",
        "received_requests": received_data,
        "sent_requests": sent_data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_user(request, username):
    """Search for a user by username and return similar usernames with user IDs, excluding the current user."""
    
    if not username:
        return Response({"status": "error", "message": "Username cannot be empty"}, status=400)
    
    # Get the currently authenticated user
    current_user = request.user
    
    # Get users whose username **starts** with the search term, excluding the current user
    similar_users = User.objects.filter(username__istartswith=username).exclude(id=current_user.id)
    
    # If no start matches, get users that **contain** the search term anywhere, excluding the current user
    if not similar_users.exists():
        similar_users = User.objects.filter(username__icontains=username).exclude(id=current_user.id)
    
    # Prepare the data to send back to the frontend
    similar_user_data = [
        {
            "user_id": user.id,
            "username": user.username
        }
        for user in similar_users
    ]
    
    if not similar_user_data:
        return Response({"status": "error", "message": "No users found"}, status=404)
    
    return Response({
        "status": "success",
        "similar_users": similar_user_data
    })
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



@csrf_exempt
def initiate_payment(request):
    try:
        # Ensure that the request method is POST
        if request.method != 'POST':
            return JsonResponse({"error": "Invalid request method"}, status=400)
        
        # Parse JSON data from the request
        data = json.loads(request.body)
        
        # Get dynamic values (amount and transaction_id) from the frontend request
        amount = data.get('amount', 0)  # Default to 0 if not provided
        transaction_id = data.get('transaction_id', '123456')  # Default to a sample ID if not provided

        # Validate the parameters
        if not amount or not transaction_id:
            return JsonResponse({"error": "Amount and transaction_id are required"}, status=400)
        
        # Construct the eSewa payment URL with query parameters
        esewa_url = settings.ESEWA_CONFIG['TEST_URL']
        payment_url = (
            f"{esewa_url}?"
            f"amt={amount}&"
            f"pdc=0&"
            f"psc=0&"
            f"txAmt=0&"
            f"tAmt={amount}&"
            f"pid={transaction_id}&"
            f"scd={settings.ESEWA_CONFIG['MERCHANT_ID']}&"
            f"su={settings.ESEWA_CONFIG['RETURN_URL']}&"
            f"fu={settings.ESEWA_CONFIG['CANCEL_URL']}"
        )
        
        # Return the payment URL to the frontend
        return JsonResponse({'payment_url': payment_url})
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
# Handle the successful payment with JWT authentication
@csrf_exempt
def payment_success(request):
    # JWT Authentication
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        decoded_token = jwt.decode(
            token, 
            settings.SECRET_KEY,  # Use your project's SECRET_KEY
            algorithms=["HS256"]
        )
        user_id = decoded_token.get('user_id')
        if not user_id:
            return JsonResponse({'status': 'error', 'message': 'Invalid token format'}, status=400)

        try:
            user = User.objects.get(id=user_id)  # Get the user from the database
        except User.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'User not found'}, status=400)
    else:
        return JsonResponse({'status': 'error', 'message': 'Authentication required'}, status=401)

    # Get parameters from eSewa response
    ref_id = request.GET.get('refId', '')
    transaction_id = request.GET.get('oid', '')
    amount = request.GET.get('amt', '')

    # Assuming the payment is successful, you can update the transaction status in the database here
    # You could store these details for later reference

    return JsonResponse({
        'status': 'success',
        'ref_id': ref_id,
        'transaction_id': transaction_id,
        'amount': amount
    })

@csrf_exempt
def payment_failure(request):
    # JWT Authentication
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        decoded_token = jwt.decode(
            token, 
            settings.SECRET_KEY,  # Use your project's SECRET_KEY
            algorithms=["HS256"]
        )
        user_id = decoded_token.get('user_id')
        if not user_id:
            return JsonResponse({'status': 'error', 'message': 'Invalid token format'}, status=400)

        try:
            user = User.objects.get(id=user_id)  # Get the user from the database
        except User.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'User not found'}, status=400)
    else:
        return JsonResponse({'status': 'error', 'message': 'Authentication required'}, status=401)

    return JsonResponse({
        'status': 'failed',
        'message': 'Payment was not successful'
    })

@csrf_exempt
def verify_payment(request):
    # JWT Authentication
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        decoded_token = jwt.decode(
            token, 
            settings.SECRET_KEY,  # Use your project's SECRET_KEY
            algorithms=["HS256"]
        )
        user_id = decoded_token.get('user_id')
        if not user_id:
            return JsonResponse({'status': 'error', 'message': 'Invalid token format'}, status=400)

        try:
            user = User.objects.get(id=user_id)  # Get the user from the database
        except User.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'User not found'}, status=400)
    else:
        return JsonResponse({'status': 'error', 'message': 'Authentication required'}, status=401)

    # Get the necessary parameters for verification
    ref_id = request.GET.get('refId')
    amount = request.GET.get('amount')
    transaction_id = request.GET.get('oid')

    # Build the verification data
    verification_data = {
        "merchantId": settings.ESEWA_CONFIG["MERCHANT_ID"],
        "refId": ref_id,
        "amount": amount,
        "transaction_uuid": transaction_id,
    }

    # Make the verification request to eSewa
    try:
        verify_response = requests.get(settings.ESEWA_CONFIG["VERIFY_URL"], params=verification_data)
        verify_response.raise_for_status()  # Raises an error for invalid responses
    except requests.exceptions.RequestException as e:
        return JsonResponse({"error": str(e)}, status=500)

    # Return the verification result as JSON
    return JsonResponse(verify_response.json(), safe=False)
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import Song, Action

def get_spotify_track(spotify_track_id):
    """Fetches track details from Spotify API using track ID."""
    access_token = get_spotify_token()
    if not access_token:
        return None  # Handle API failure gracefully

    url = f"https://api.spotify.com/v1/tracks/{spotify_track_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        track_data = response.json()
        return {
            "name": track_data['name'],
            "artist": ", ".join(artist['name'] for artist in track_data['artists']),
            "album": track_data['album']['name'],
            "duration": track_data['duration_ms'] // 1000,  # Convert to seconds
            "url": track_data['external_urls']['spotify']
        }
    
    return None  # Return None if track not found
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_song(request, spotify_track_id):
    """Allows authenticated users to like a song, fetching details from Spotify if needed."""
    user = request.user

    song = Song.objects.filter(spotify_id=spotify_track_id).first()
    if not song:
        song_details = get_spotify_track(spotify_track_id)
        if not song_details:
            return JsonResponse({'status': 'error', 'message': 'Unable to fetch song details'}, status=404)
        
        song = Song.objects.create(
            spotify_id=spotify_track_id,
            name=song_details['name'],
            artist=song_details['artist'],
            album=song_details['album'],
            duration=song_details['duration'],
            url=song_details['url']
        )

    action, created = Action.objects.get_or_create(user=user, song=song, action_type='like')
    message = 'Song liked successfully' if created else 'Song was already liked'
    return JsonResponse({'status': 'success', 'message': message})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_song(request, spotify_track_id):
    """Allows authenticated users to save a song, fetching details from Spotify if needed."""
    user = request.user

    song = Song.objects.filter(spotify_id=spotify_track_id).first()
    if not song:
        song_details = get_spotify_track(spotify_track_id)
        if not song_details:
            return JsonResponse({'status': 'error', 'message': 'Unable to fetch song details'}, status=404)

        song = Song.objects.create(
            spotify_id=spotify_track_id,
            name=song_details['name'],
            artist=song_details['artist'],
            album=song_details['album'],
            duration=song_details['duration'],
            url=song_details['url']
        )

    action, created = Action.objects.get_or_create(user=user, song=song, action_type='save')
    message = 'Song saved successfully' if created else 'Song was already saved'
    return JsonResponse({'status': 'success', 'message': message})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def play_song(request, spotify_track_id):
    """Tracks when a user plays a song, fetching details from Spotify if needed."""
    user = request.user
    
    # Get duration listened if provided
    data = json.loads(request.body) if request.body else {}
    duration = data.get('duration')  # Duration listened in seconds

    song = Song.objects.filter(spotify_id=spotify_track_id).first()
    if not song:
        song_details = get_spotify_track(spotify_track_id)
        if not song_details:
            return JsonResponse({'status': 'error', 'message': 'Unable to fetch song details'}, status=404)

        song = Song.objects.create(
            spotify_id=spotify_track_id,
            name=song_details['name'],
            artist=song_details['artist'],
            album=song_details['album'],
            duration=song_details['duration'],
            url=song_details['url']
        )

    Action.objects.create(
        user=user, 
        song=song, 
        action_type='play',
        duration=duration,
        context=data.get('context')  # e.g., 'playlist', 'search_results', 'recommendation'
    )
    return JsonResponse({'status': 'success', 'message': 'Song played successfully'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def skip_song(request, spotify_track_id):
    """Tracks when a user skips a song, fetching details from Spotify if needed."""
    user = request.user

    song = Song.objects.filter(spotify_id=spotify_track_id).first()
    if not song:
        song_details = get_spotify_track(spotify_track_id)
        if not song_details:
            return JsonResponse({'status': 'error', 'message': 'Unable to fetch song details'}, status=404)

        song = Song.objects.create(
            spotify_id=spotify_track_id,
            name=song_details['name'],
            artist=song_details['artist'],
            album=song_details['album'],
            duration=song_details['duration'],
            url=song_details['url']
        )

    Action.objects.create(user=user, song=song, action_type='skip')
    return JsonResponse({'status': 'success', 'message': 'Song skipped successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def view_song(request, spotify_track_id):
    """Tracks when a user views a song's details, fetching from Spotify if needed."""
    user = request.user

    song = Song.objects.filter(spotify_id=spotify_track_id).first()
    if not song:
        song_details = get_spotify_track(spotify_track_id)
        if not song_details:
            return JsonResponse({'status': 'error', 'message': 'Unable to fetch song details'}, status=404)

        song = Song.objects.create(
            spotify_id=spotify_track_id,
            name=song_details['name'],
            artist=song_details['artist'],
            album=song_details['album'],
            duration=song_details['duration'],
            url=song_details['url']
        )

    Action.objects.create(user=user, song=song, action_type='view')
    return JsonResponse({'status': 'success', 'message': 'Song view recorded'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def share_song(request, spotify_track_id):
    """Tracks when a user shares a song, fetching from Spotify if needed."""
    user = request.user
    
    # Optionally capture share context (e.g., platform shared to)
    data = json.loads(request.body) if request.body else {}
    context = data.get('context', 'general')  # e.g., 'facebook', 'twitter', 'email'

    song = Song.objects.filter(spotify_id=spotify_track_id).first()
    if not song:
        song_details = get_spotify_track(spotify_track_id)
        if not song_details:
            return JsonResponse({'status': 'error', 'message': 'Unable to fetch song details'}, status=404)

        song = Song.objects.create(
            spotify_id=spotify_track_id,
            name=song_details['name'],
            artist=song_details['artist'],
            album=song_details['album'],
            duration=song_details['duration'],
            url=song_details['url']
        )

    Action.objects.create(
        user=user, 
        song=song, 
        action_type='share',
        context=context
    )
    return JsonResponse({'status': 'success', 'message': 'Song share recorded'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_song(request, spotify_track_id):
    """Tracks when a user listens to a song completely, fetching from Spotify if needed."""
    user = request.user

    song = Song.objects.filter(spotify_id=spotify_track_id).first()
    if not song:
        song_details = get_spotify_track(spotify_track_id)
        if not song_details:
            return JsonResponse({'status': 'error', 'message': 'Unable to fetch song details'}, status=404)

        song = Song.objects.create(
            spotify_id=spotify_track_id,
            name=song_details['name'],
            artist=song_details['artist'],
            album=song_details['album'],
            duration=song_details['duration'],
            url=song_details['url']
        )

    Action.objects.create(user=user, song=song, action_type='complete')
    return JsonResponse({'status': 'success', 'message': 'Song completion recorded'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def track_search(request):
    """Tracks user search queries for songs, artists, or albums."""
    try:
        data = json.loads(request.body)
        query = data.get('query', '').strip()
        search_type = data.get('type', 'general')  # 'song', 'artist', 'album', or 'general'
        
        if not query:
            return JsonResponse({'status': 'error', 'message': 'Empty search query'}, status=400)
        
        # Record the search action - note this doesn't have a song associated with it
        Action.objects.create(
            user=request.user,
            action_type='search',
            search_query=query,
            search_type=search_type
        )
        
        return JsonResponse({'status': 'success', 'message': 'Search action tracked'})
        
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON format'}, status=400)

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
    
@csrf_exempt
def session(request):
    """Debug view to check session status"""
    return JsonResponse({
        'session_key': request.session.session_key,
        'user_authenticated': request.user.is_authenticated,
        'username': request.user.username if request.user.is_authenticated else None,
        'session_data': dict(request.session)
    })







@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def playlist_songs(request, playlist_id):
    """
    GET: Retrieve songs in a playlist.
    POST: Add a song to the playlist.
    DELETE: Remove a song from the playlist.
    """
    user = request.user
    
    try:
        playlist = Playlist.objects.get(id=playlist_id, user=user)
    except Playlist.DoesNotExist:
        return Response({"status": "error", "message": "Playlist not found"}, status=404)
    
    if request.method == 'GET':
        playlist_songs = PlaylistSong.objects.filter(playlist=playlist).select_related('song')
        serializer = PlaylistSongSerializer(playlist_songs, many=True)
        return Response({
            "status": "success", 
            "playlist_title": playlist.title,
            "songs": serializer.data
        })
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            spotify_track_id = data.get('spotify_track_id')
            
            if not spotify_track_id:
                return Response({"status": "error", "message": "Missing spotify_track_id"}, status=400)
            
            # Find or create the song
            song = Song.objects.filter(spotify_id=spotify_track_id).first()
            if not song:
                song_details = get_spotify_track(spotify_track_id)
                if not song_details:
                    return Response({'status': 'error', 'message': 'Unable to fetch song details'}, status=404)
                
                song = Song.objects.create(
                    spotify_id=spotify_track_id,
                    name=song_details['name'],
                    artist=song_details['artist'],
                    album=song_details['album'],
                    duration=song_details['duration'],
                    url=song_details['url']
                )
            
            # Add to playlist if not already there
            _, created = PlaylistSong.objects.get_or_create(playlist=playlist, song=song)
            
            # Create a "save" action for tracking metrics
            Action.objects.get_or_create(
                user=user, 
                song=song, 
                action_type='save',
                defaults={'context': f'playlist:{playlist.id}'}
            )
            
            return Response({
                "status": "success", 
                "message": "Song added to playlist" if created else "Song already in playlist"
            })
            
        except json.JSONDecodeError:
            return Response({"status": "error", "message": "Invalid JSON"}, status=400)
    
    elif request.method == 'DELETE':
        try:
            data = json.loads(request.body)
            spotify_track_id = data.get('spotify_track_id')
            
            if not spotify_track_id:
                return Response({"status": "error", "message": "Missing spotify_track_id"}, status=400)
            
            try:
                song = Song.objects.get(spotify_id=spotify_track_id)
                playlist_song = PlaylistSong.objects.get(playlist=playlist, song=song)
                playlist_song.delete()
                return Response({"status": "success", "message": "Song removed from playlist"})
            except (Song.DoesNotExist, PlaylistSong.DoesNotExist):
                return Response({"status": "error", "message": "Song not found in playlist"}, status=404)
            
        except json.JSONDecodeError:
            return Response({"status": "error", "message": "Invalid JSON"}, status=400)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def playlists(request):
    """
    GET: List all playlists for the user
    POST: Create a new playlist
    """
    user = request.user
    
    if request.method == 'GET':
        playlists = Playlist.objects.filter(user=user)
        serializer = PlaylistSerializer(playlists, many=True)
        return Response({
            "status": "success",
            "playlists": serializer.data
        })
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            title = data.get('title')
            
            if not title:
                return Response({"status": "error", "message": "Missing playlist title"}, status=400)
            
            playlist = Playlist.objects.create(
                user=user,
                title=title
            )
            
            serializer = PlaylistSerializer(playlist)
            return Response({
                "status": "success",
                "message": "Playlist created",
                "playlist": serializer.data
            }, status=201)
            
        except json.JSONDecodeError:
            return Response({"status": "error", "message": "Invalid JSON"}, status=400)
        
@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def playlist_detail(request, playlist_id):
    """
    GET: Get playlist details
    PUT: Update playlist information (e.g., title)
    DELETE: Delete a playlist
    """
    user = request.user
    
    try:
        playlist = Playlist.objects.get(id=playlist_id, user=user)
    except Playlist.DoesNotExist:
        return Response({"status": "error", "message": "Playlist not found"}, status=404)
    
    if request.method == 'GET':
        serializer = PlaylistSerializer(playlist)
        return Response({
            "status": "success",
            "playlist": serializer.data
        })
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            title = data.get('title')
            
            if title:
                playlist.title = title
                playlist.save()
                
            serializer = PlaylistSerializer(playlist)
            return Response({
                "status": "success",
                "message": "Playlist updated",
                "playlist": serializer.data
            })
            
        except json.JSONDecodeError:
            return Response({"status": "error", "message": "Invalid JSON"}, status=400)
    
    elif request.method == 'DELETE':
        playlist.delete()
        return Response({
            "status": "success",
            "message": "Playlist deleted"
        })
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_liked_songs(request):
    """Retrieve the playlist of liked songs for the authenticated user."""
    liked_songs = Action.objects.filter(user=request.user, action_type="like").select_related("song")
    serializer = LikedSongSerializer(liked_songs, many=True)  # Use the LikedSongSerializer for liked songs
    return Response({"status": "success", "playlist": serializer.data})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_friends(request):
    """List all the friends of the logged-in user."""
    user = request.user  # Get the logged-in user

    # Find accepted friend requests where the user is either the sender or receiver
    friends = FriendRequest.objects.filter(
        (Q(sender=user) & Q(status='accepted')) | (Q(receiver=user) & Q(status='accepted'))
    )

    # Get the list of friends by checking both sender and receiver
    friend_users = []
    for friend in friends:
        if friend.sender == user:
            friend_users.append(friend.receiver)
        else:
            friend_users.append(friend.sender)

    # Return the list of friends' usernames
    friend_usernames = [friend.username for friend in friend_users]

    return JsonResponse({'status': 'success', 'friends': friend_usernames})

@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    GET: Retrieve user profile information
    POST: Update user profile information (excluding profile picture)
    """
    # Get or create the user profile
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'GET':
        # Return the current profile data
        profile_data = {
            'username': request.user.username,
            'email': request.user.email,
            'name': profile.name or '',
            'pronoun': profile.pronoun or '',
            'gender': profile.gender or '',
            'bio': profile.bio or '',
            'profile_picture': request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None,
            'joined_date': profile.joined_date.strftime("%Y-%m-%d %H:%M:%S")
        }
        return JsonResponse({'status': 'success', 'profile': profile_data})
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format'}, status=400)
        
        # Update fields if provided
        if 'name' in data:
            profile.name = data.get('name', '').strip()
        if 'pronoun' in data:
            profile.pronoun = data.get('pronoun', '').strip()
        if 'gender' in data:
            profile.gender = data.get('gender', '').strip()
        if 'bio' in data:
            profile.bio = data.get('bio', '').strip()
        

        if 'spotify_id' in data:
            profile.spotify_id = data.get('spotify_id')
        
        # Save changes
        profile.save()
        
        return JsonResponse({
            'status': 'success',
            'message': 'Profile updated successfully'
        })

# New dedicated endpoint for profile picture upload
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_profile_picture(request):
    """Handle profile picture uploads"""
    if 'picture' not in request.FILES:
        return JsonResponse({'status': 'error', 'message': 'No image provided'}, status=400)
    
    # Get or create the user profile
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    # Handle the uploaded file
    image = request.FILES['picture']
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif']
    if image.content_type not in allowed_types:
        return JsonResponse({'status': 'error', 'message': 'Invalid file type. Only JPEG, PNG and GIF are allowed.'}, status=400)
    
    # Validate file size (e.g., limit to 5MB)
    if image.size > 5 * 1024 * 1024:
        return JsonResponse({'status': 'error', 'message': 'Image too large. Maximum size is 5MB.'}, status=400)
    
    # Remove old profile picture if exists
    if profile.profile_picture:
        try:
            old_path = profile.profile_picture.path
            if default_storage.exists(old_path):
                default_storage.delete(old_path)
        except Exception:
            # Just log error if old file couldn't be deleted
            pass
    
    # Generate a unique filename
    filename = f"profile_{request.user.id}_{int(time.time())}.{image.name.split('.')[-1]}"
    
    # Save the new profile picture
    profile.profile_picture.save(filename, image)
    
    return JsonResponse({
        'status': 'success',
        'message': 'Profile picture updated successfully',
        'picture_url': request.build_absolute_uri(profile.profile_picture.url)
    })



  

API_KEY = "your_api_key_here"

def get_lyrics(track_name, artist_name):
    url = "https://api.musixmatch.com/ws/1.1/matcher.lyrics.get"
    params = {
        "q_track": track_name,
        "q_artist": artist_name,
        "apikey": API_KEY
    }
    
    response = requests.get(url, params=params)
    data = response.json()

    if data["message"]["header"]["status_code"] == 200:
        lyrics = data["message"]["body"]["lyrics"]["lyrics_body"]
        return lyrics
    else:
        return "Lyrics not found!"


@api_view(['POST', 'GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_music(request):
    """
    GET: Retrieve music tracks added to user profile
    POST: Add a Spotify track to user profile
    DELETE: Remove a track from user profile
    """
    # Get the user profile
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    # We'll need a new model to store the music tracks
    # Create it if you haven't already
    
    if request.method == 'GET':
        # Get all tracks for the user
        tracks = UserMusic.objects.filter(user=request.user).order_by('-added_at')
        
        tracks_data = [{
            'id': track.id,
            'spotify_track_id': track.spotify_track_id,
            'track_name': track.track_name,
            'artist_name': track.artist_name,
            'album_name': track.album_name,
            'added_at': track.added_at.strftime("%Y-%m-%d %H:%M:%S")
        } for track in tracks]
        
        return JsonResponse({
            'status': 'success',
            'tracks': tracks_data
        })
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format'}, status=400)
        
        # Get the Spotify track ID from the request
        spotify_track_id = data.get('spotify_track_id', '').strip()
        
        if not spotify_track_id:
            return JsonResponse({'status': 'error', 'message': 'Spotify track ID is required'}, status=400)
        
        # Check if track already exists for this user
        if UserMusic.objects.filter(user=request.user, spotify_track_id=spotify_track_id).exists():
            return JsonResponse({'status': 'error', 'message': 'This track is already in your profile'}, status=400)
        
        # Get track metadata from request
        track_name = data.get('track_name', '').strip()
        artist_name = data.get('artist_name', '').strip()
        album_name = data.get('album_name', '').strip()
        
        # Create a new user music entry
        user_music = UserMusic.objects.create(
            user=request.user,
            spotify_track_id=spotify_track_id,
            track_name=track_name,
            artist_name=artist_name,
            album_name=album_name
        )
        
        return JsonResponse({
            'status': 'success',
            'message': 'Track added to your profile',
            'track': {
                'id': user_music.id,
                'spotify_track_id': user_music.spotify_track_id,
                'track_name': user_music.track_name,
                'artist_name': user_music.artist_name,
                'album_name': user_music.album_name,
                'added_at': user_music.added_at.strftime("%Y-%m-%d %H:%M:%S")
            }
        }, status=201)
    
    elif request.method == 'DELETE':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format'}, status=400)
        
        # Get track ID to remove
        track_id = data.get('id')
        spotify_track_id = data.get('spotify_track_id')
        
        if track_id:
            # Remove by database ID
            try:
                track = UserMusic.objects.get(id=track_id, user=request.user)
                track.delete()
                return JsonResponse({
                    'status': 'success',
                    'message': 'Track removed from your profile'
                })
            except UserMusic.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': 'Track not found'}, status=404)
        
        elif spotify_track_id:
            # Remove by Spotify track ID
            try:
                track = UserMusic.objects.get(spotify_track_id=spotify_track_id, user=request.user)
                track.delete()
                return JsonResponse({
                    'status': 'success',
                    'message': 'Track removed from your profile'
                })
            except UserMusic.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': 'Track not found'}, status=404)
        
        else:
            return JsonResponse({'status': 'error', 'message': 'Track ID is required'}, status=400)
        
from .algorithms import update_user_similarities, calculate_recommendation_scores
from .serializer import RecommendationSerializer
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendations(request):
    """
    Endpoint to get song recommendations for the current user
    """
    # Update user similarities in the background (could be moved to a periodic task)
    update_user_similarities(request.user)
    
    # Calculate recommendations for the user
    calculate_recommendation_scores(request.user)
    
    # Get top recommendations
    limit = int(request.query_params.get('limit', 20))
    recommendations = Recommendation.objects.filter(
        user=request.user
    ).order_by('-recommendation_score')[:limit]
    
    serializer = RecommendationSerializer(recommendations, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendations_by_artist(request, artist_name):
    """
    Get recommendations filtered by artist name
    """
    limit = int(request.query_params.get('limit', 20))
    
    # First make sure recommendations are up to date
    calculate_recommendation_scores(request.user)
    
    # Get recommendations filtered by artist
    recommendations = Recommendation.objects.filter(
        user=request.user,
        song__artist__icontains=artist_name
    ).order_by('-recommendation_score')[:limit]
    
    serializer = RecommendationSerializer(recommendations, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_similar_users(request):
    """
    Get users similar to the current user
    """
    limit = int(request.query_params.get('limit', 5))
    
    # Update similarities first
    update_user_similarities(request.user)
    
    # Get similar users - using your existing model field names
    similar_users = UserSimilarity.objects.filter(
        user1=request.user
    ).order_by('-similarity_score')[:limit]
    
    # Format the response
    similar_users_data = [
        {
            'user_id': similarity.user2.id,
            'username': similarity.user2.username,
            'similarity_score': similarity.similarity_score
        }
        for similarity in similar_users
    ]
    
    return Response(similar_users_data)








@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_preferences(request):
    """
    Endpoint to retrieve the user's preferences (favorite artists, genres, etc.)
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        return Response(user_profile.preferences, status=200)
    except UserProfile.DoesNotExist:
        return Response({"detail": "User profile not found"}, status=404)
    
# Add this temporary code to your views.py or somewhere that gets executed
from app.models import UserProfile
print("UserProfile fields:", [f.name for f in UserProfile._meta.get_fields()])



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_advanced_recommendations(request):
    """
    Enhanced recommendation endpoint that provides multiple recommendation types
    """
    user = request.user
    limit = int(request.query_params.get('limit', 10))
    
    # Update preferences first
    update_preferences_based_on_actions(user)
    
    # Calculate recommendations for the user
    calculate_recommendation_scores(user)
    
    # Prepare response with multiple recommendation sections
    response = {
        "personalized": get_personalized_recommendations(user, limit),
        "trending": get_trending_recommendations(limit),
        "discover_weekly": get_discovery_recommendations(user, limit),
        "based_on_favorites": get_favorite_based_recommendations(user, limit),
        "similar_users_picks": get_similar_users_recommendations(user, limit)
    }
    
    return Response(response)

def get_personalized_recommendations(user, limit=10):
    """Get top personalized recommendations"""
    recommendations = Recommendation.objects.filter(
        user=user
    ).order_by('-recommendation_score')[:limit]
    
    return RecommendationSerializer(recommendations, many=True).data

def get_trending_recommendations(limit=10):
    """Get trending songs based on recent activity"""
    # Get songs with most actions in the last 7 days
    recent_date = timezone.now() - timezone.timedelta(days=7)
    
    trending_songs = Action.objects.filter(
        timestamp__gte=recent_date
    ).values('song').annotate(
        count=Count('id')
    ).order_by('-count')[:limit]
    
    song_ids = [item['song'] for item in trending_songs]
    songs = Song.objects.filter(id__in=song_ids)
    
    return SongSerializer(songs, many=True).data

def get_discovery_recommendations(user, limit=10):
    """Get recommendations for genres user rarely explores"""
    # Get user's frequent genres
    try:
        profile = UserProfile.objects.get(user=user)
        common_genres = profile.preferences.get('favorite_genres', [])
    except UserProfile.DoesNotExist:
        common_genres = []
    
    # Find songs from less-explored genres
    user_action_songs = Action.objects.filter(user=user).values_list('song_id', flat=True)
    
    discovery_songs = Song.objects.exclude(
        id__in=user_action_songs
    ).exclude(
        genres__overlap=common_genres
    ).order_by('?')[:limit]  # Random selection
    
    return SongSerializer(discovery_songs, many=True).data

def get_favorite_based_recommendations(user, limit=10):
    """Get recommendations based on user's favorite artists"""
    try:
        profile = UserProfile.objects.get(user=user)
        favorite_artists = profile.preferences.get('favorite_artists', [])
    except UserProfile.DoesNotExist:
        return []
    
    if not favorite_artists:
        return []
    
    # Get songs from favorite artists that user hasn't interacted with
    user_song_ids = Action.objects.filter(user=user).values_list('song_id', flat=True)
    
    artist_songs = Song.objects.filter(
        artist__in=favorite_artists
    ).exclude(
        id__in=user_song_ids
    )[:limit]
    
    return SongSerializer(artist_songs, many=True).data

def get_similar_users_recommendations(user, limit=10):
    """Get recommendations based on similar users' favorites"""
    # Get similar users
    similar_users = UserSimilarity.objects.filter(
        user1=user
    ).order_by('-similarity_score')[:5]
    
    if not similar_users:
        return []
    
    # Get songs that similar users liked but current user hasn't interacted with
    user_song_ids = set(Action.objects.filter(user=user).values_list('song_id', flat=True))
    
    similar_user_ids = [sim.user2.id for sim in similar_users]
    similar_users_liked = Action.objects.filter(
        user_id__in=similar_user_ids,
        action_type='like'
    ).exclude(
        song_id__in=user_song_ids
    ).values('song').annotate(
        like_count=Count('id')
    ).order_by('-like_count')[:limit]
    
    song_ids = [item['song'] for item in similar_users_liked]
    songs = Song.objects.filter(id__in=song_ids)
    
    return SongSerializer(songs, many=True).data


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendation_insights(request):
    """
    Provide insights into why certain songs are being recommended
    """
    user = request.user
    
    # Get top recommendations
    top_recommendations = Recommendation.objects.filter(
        user=user
    ).order_by('-recommendation_score')[:10]
    
    insights = []
    
    for rec in top_recommendations:
        song = rec.song
        reasons = []
        
        # Check if by favorite artist
        try:
            profile = UserProfile.objects.get(user=user)
            if song.artist in profile.preferences.get('favorite_artists', []):
                reasons.append(f"By {song.artist}, one of your favorite artists")
        except UserProfile.DoesNotExist:
            pass
            
        # Check if similar users liked it
        similar_users = UserSimilarity.objects.filter(user1=user).order_by('-similarity_score')[:5]
        similar_user_ids = [sim.user2.id for sim in similar_users]
        
        similar_likes = Action.objects.filter(
            user_id__in=similar_user_ids,
            song=song,
            action_type='like'
        ).count()
        
        if similar_likes > 0:
            reasons.append(f"Liked by {similar_likes} users with similar taste")
            
        # Add genre match
        user_genres = profile.preferences.get('favorite_genres', [])
        matching_genres = set(song.genres) & set(user_genres)
        
        if matching_genres:
            reasons.append(f"Matches your preferred genres: {', '.join(matching_genres)}")
            
        insights.append({
            'song': SongSerializer(song).data,
            'score': rec.recommendation_score,
            'reasons': reasons
        })
        
    return Response(insights)


def get_contextual_recommendations(user, limit=20):
    """
    Get recommendations based on current context (time of day, day of week)
    """
    now = timezone.now()
    hour = now.hour
    day_of_week = now.weekday()  # 0-6 (Monday-Sunday)
    
    # Define time contexts
    context = None
    if 6 <= hour < 10:
        context = "morning"
    elif 10 <= hour < 14:
        context = "midday"
    elif 14 <= hour < 18:
        context = "afternoon"
    elif 18 <= hour < 22:
        context = "evening"
    else:
        context = "night"
        
    # Weekend vs weekday
    is_weekend = day_of_week >= 5  # Saturday or Sunday
    
    # Get context-specific songs
    # This is a simplified example - you'd need to tag songs with contexts
    contextual_songs = Song.objects.filter(
        context_tags__contains=[context]
    )
    
    if is_weekend:
        contextual_songs = contextual_songs.filter(
            energy_level__gte=0.7  # More energetic on weekends
        )
    else:
        if context == "morning":
            contextual_songs = contextual_songs.filter(
                energy_level__lte=0.5  # Calmer in weekday mornings
            )
    
    # Combine with user preferences
    user_song_ids = set(Action.objects.filter(user=user).values_list('song_id', flat=True))
    
    try:
        profile = UserProfile.objects.get(user=user)
        favorite_genres = profile.preferences.get('favorite_genres', [])
        
        if favorite_genres:
            contextual_songs = contextual_songs.filter(
                genres__overlap=favorite_genres
            )
    except UserProfile.DoesNotExist:
        pass
        
    return contextual_songs.exclude(id__in=user_song_ids)[:limit]




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def provide_recommendation_feedback(request):
    """
    Allow users to provide feedback on recommendations
    """
    song_id = request.data.get('song_id')
    feedback_type = request.data.get('feedback_type')  # 'like', 'dislike', 'not_interested'
    
    if not song_id or not feedback_type:
        return Response({"detail": "Missing required parameters"}, status=400)
        
    try:
        song = Song.objects.get(id=song_id)
    except Song.DoesNotExist:
        return Response({"detail": "Song not found"}, status=404)
        
    # Create or update recommendation feedback
    if feedback_type == 'like':
        # Create a like action
        Action.objects.create(user=request.user, song=song, action_type='like')
        
        # Boost recommendation score
        Recommendation.objects.update_or_create(
            user=request.user,
            song=song,
            defaults={'recommendation_score': F('recommendation_score') + 5}
        )
    elif feedback_type == 'dislike':
        # Reduce recommendation score substantially
        Recommendation.objects.update_or_create(
            user=request.user,
            song=song,
            defaults={'recommendation_score': F('recommendation_score') - 10}
        )
    elif feedback_type == 'not_interested':
        # Reduce recommendation score moderately
        Recommendation.objects.update_or_create(
            user=request.user,
            song=song,
            defaults={'recommendation_score': F('recommendation_score') - 5}
        )
    
    # Update user preferences based on this feedback
    update_preferences_based_on_actions(request.user)
    
    return Response({"status": "success"})