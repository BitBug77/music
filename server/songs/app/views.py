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
import random
import time
import json
from datetime import datetime, timedelta
from django.core.cache import cache
import sys
import os
import logging
import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.cache.backends.base import DEFAULT_TIMEOUT
from django.conf import settings
from django.db import models
from .spotify_utils import get_spotify_token, get_spotify_track, store_spotify_tracks, get_recommendations_for_new_user, get_related_spotify_tracks


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
        refresh.set_exp(lifetime=timedelta(days=7)) 
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
    """Fetch songs from Spotify API with randomization to provide variety."""
    access_token = get_spotify_token()
    
    if not access_token:
        return JsonResponse({"status": "error", "message": "Failed to get Spotify token"}, status=500)
    
    # Spotify search API to fetch songs
    search_url = "https://api.spotify.com/v1/search"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Add randomization by using different search terms
    search_terms = [
        "a", "e", "i", "o", "u",  # Vowels for broader results
        "top", "hit", "new", "popular", "trending",
        "year", "dance", "rock", "pop", "hip"
    ]
    
    # Randomly select a search term
    import random
    random_term = random.choice(search_terms)
    
    # Randomly select offset to get different results each time
    random_offset = random.randint(0, 950)  # Spotify max offset is 1000
    
    params = {
        "q": random_term,
        "type": "track",
        "limit": 50,  # Maximum allowed per request
        "offset": random_offset
    }
    
    response = requests.get(search_url, headers=headers, params=params)
    
    if response.status_code != 200:
        return JsonResponse({"status": "error", "message": "Failed to fetch songs"}, status=response.status_code)
    
    songs = response.json().get("tracks", {}).get("items", [])
    
    if not songs:
        return JsonResponse({"status": "error", "message": "No songs found"}, status=404)
    
    # Sort songs by popularity in descending order
    sorted_songs = sorted(songs, key=lambda x: x["popularity"], reverse=True)
    
    # For additional randomness, shuffle a portion of the top songs
    # This ensures you still get popular songs but in a different order each time
    top_portion = sorted_songs[:30]  # Take the top 30 songs
    random.shuffle(top_portion)  # Shuffle them
    sorted_songs = top_portion + sorted_songs[30:]  # Combine with the rest
    
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

# views.py

from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import User, FriendRequest
from .kafka_producer import send_kafka_message
from django.conf import settings

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_friend_request(request):
    """Send a friend request to another user using username or user_id in request body"""
    
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
    
    # Send Kafka message
    message = {
        'event': 'friend_request_sent',
        'sender_id': sender.id,
        'receiver_id': receiver.id,
        'sender_username': sender.username,
        'receiver_username': receiver.username
    }
    send_kafka_message(settings.KAFKA_TOPIC, message)
    
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
    
    request_id = request.data.get('requestId')
    action = request.data.get('action')
    
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
            
            # Send Kafka message for accepted request
            message = {
                'event': 'friend_request_accepted',
                'sender_id': friend_request.sender.id,
                'receiver_id': friend_request.receiver.id,
                'sender_username': friend_request.sender.username,
                'receiver_username': friend_request.receiver.username
            }
            send_kafka_message(settings.KAFKA_TOPIC, message)
            
            return JsonResponse({"status": "success", "message": "Friend request accepted"})
        
        elif action == "decline":
            friend_request.status = "rejected"
            friend_request.save()
            
            # Send Kafka message for declined request
            message = {
                'event': 'friend_request_rejected',
                'sender_id': friend_request.sender.id,
                'receiver_id': friend_request.receiver.id,
                'sender_username': friend_request.sender.username,
                'receiver_username': friend_request.receiver.username
            }
            send_kafka_message(settings.KAFKA_TOPIC, message)
            
            return JsonResponse({"status": "success", "message": "Friend request rejected"})
        
        else:
            return JsonResponse({"status": "error", "message": "Invalid action. Use 'accept' or 'reject'"}, status=400)
    
    except FriendRequest.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Friend request not found or you don't have permission"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
from .models import Notification

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """Get all notifications for the current user"""
    notifications = Notification.objects.filter(recipient=request.user)
    
    data = []
    for notification in notifications:
        data.append({
            'id': notification.id,
            'sender': {
                'id': notification.sender.id,
                'username': notification.sender.username
            },
            'type': notification.notification_type,
            'message': notification.message,
            'is_read': notification.is_read,
            'created_at': notification.created_at
        })
    
    return JsonResponse({'notifications': data})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark a notification as read"""
    try:
        notification = Notification.objects.get(id=notification_id, recipient=request.user)
        notification.is_read = True
        notification.save()
        return JsonResponse({'status': 'success', 'message': 'Notification marked as read'})
    except Notification.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Notification not found'}, status=404)

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

import requests

import requests



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
            album_cover=song_details['album_cover'],
            genre=song_details['genre'],
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
            album_cover=song_details['album_cover'],
            genre=song_details['genre'],
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
            album_cover=song_details['album_cover'],
            genre=song_details['genre'],
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
            album_cover=song_details['album_cover'],
            genre=song_details['genre'],
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
            album_cover=song_details['album_cover'],
            genre=song_details['genre'],
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
            album_cover=song_details['album_cover'],
            genre=song_details['genre'],
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
        
        # Serialize data with album cover
        songs_data = [{
            "id": ps.song.id,
            "spotify_id": ps.song.spotify_id,
            "name": ps.song.name,
            "artist": ps.song.artist,
            "album": ps.song.album,
            "album_cover": ps.song.album_cover  # Include album cover URL
        } for ps in playlist_songs]
        
        return Response({
            "status": "success", 
            "playlist_title": playlist.title,
            "songs": songs_data
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
                song_details = get_spotify_track(spotify_track_id)  # Fetch details from Spotify API
                if not song_details:
                    return Response({'status': 'error', 'message': 'Unable to fetch song details'}, status=404)
                
                # Save song with album cover
                song = Song.objects.create(
                    spotify_id=spotify_track_id,
                    name=song_details['name'],
                    artist=song_details['artist'],
                    album=song_details['album'],
                    duration=song_details['duration'],
                    url=song_details['url'],
                    album_cover=song_details['album_cover']  # Store album cover URL
                )
            
            # Add to playlist if not already there
            _, created = PlaylistSong.objects.get_or_create(playlist=playlist, song=song)
            
            return Response({
                "status": "success", 
                "message": "Song added to playlist" if created else "Song already in playlist",
                "song": {
                    "id": song.id,
                    "spotify_id": song.spotify_id,
                    "name": song.name,
                    "artist": song.artist,
                    "album": song.album,
                    "album_cover": song.album_cover  # Ensure album cover is returned
                }
            })
            
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
    friend_usernames = [friend_users.username for friend_users in friend_users]

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





from .serializer import SongSerializer, RecommendationSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_personalized_recommendations_view(request):
    """Get top personalized recommendations"""
    user = request.user
    limit = int(request.query_params.get('limit', 10))
    recommendations = Recommendation.objects.filter(
        user=user
    ).order_by('-recommendation_score')[:limit]
    
    return Response(RecommendationSerializer(recommendations, many=True).data)















from rest_framework import status

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_preferences_update(request):
    """
    Trigger automatic update of user preferences based on their action history
    """
    user = request.user
    
    # Call the algorithm function to update preferences based on user actions
    update_preferences_based_on_actions(user)
    
    # Retrieve the updated preferences to return in the response
    try:
        user_profile = UserProfile.objects.get(user=user)
        updated_preferences = user_profile.preferences
        
        return Response({
            "status": "success",
            "message": "User preferences automatically updated based on action history",
            "preferences": updated_preferences
        }, status=status.HTTP_200_OK)
    except UserProfile.DoesNotExist:
        return Response({
            "status": "error",
            "message": "User profile not found"
        }, status=status.HTTP_404_NOT_FOUND)
    





# New API view for discovery-focused recommendations


# Modified version of the existing endpoint to include a mix of familiar and new content















import random

def diversify_recommendations(recommendations, diversity_factor=0.2):
    """
    Diversify recommendations to prevent echo chamber effect.
    """
    diversified = []
    seen_artists = set()
    
    for song, score in recommendations:
        if song.artist not in seen_artists or random.random() < diversity_factor:
            diversified.append((song, score))
            seen_artists.add(song.artist)
    
    return diversified
def recommend_songs_combined(user, limit=20):
    """
    Combine collaborative filtering and content-based recommendations.
    """
    # Get collaborative filtering recommendations
    collaborative_recommendations = recommend_songs_collaborative(user, limit=limit // 2)
    
    # Get content-based recommendations
    content_based_recommendations = recommend_songs_content_based(user, limit=limit // 2)
    
    # Combine the recommendations
    combined_recommendations = collaborative_recommendations + content_based_recommendations
    
    # Remove duplicates while preserving order
    seen = set()
    unique_recommendations = []
    for song in combined_recommendations:
        # Fix: The error occurs here because 'song' is a list, not an object with spotify_id attribute
        # Access the spotify_id correctly based on the structure of your recommendation items
        
        # If song is an object with spotify_id attribute
        if hasattr(song, 'spotify_id'):
            if song.spotify_id not in seen:
                unique_recommendations.append(song)
                seen.add(song.spotify_id)
        # If song is a tuple (song, score) where song is an object
        elif isinstance(song, tuple) and hasattr(song[0], 'spotify_id'):
            if song[0].spotify_id not in seen:
                unique_recommendations.append(song[0])
                seen.add(song[0].spotify_id)
        # If song is a dictionary with spotify_id key
        elif isinstance(song, dict) and 'spotify_id' in song:
            if song['spotify_id'] not in seen:
                unique_recommendations.append(song)
                seen.add(song['spotify_id'])
    
    # Limit the number of recommendations to the specified limit
    unique_recommendations = unique_recommendations[:limit]
    
    return unique_recommendations, len(unique_recommendations)
def recommend_songs_hybrid(user, limit=20):
    """
    Enhanced hybrid recommendation system that combines:
    1. Collaborative filtering
    2. Content-based recommendations
    3. Spotify API for enriching recommendations
    4. Special handling for new users
    """
    # Check if user has very limited history
    action_count = Action.objects.filter(user=user).count()
    if action_count <= 1:
        # For new users, get recommendations based on their limited history
        spotify_tracks = get_recommendations_for_new_user(user, limit=limit)
        return store_spotify_tracks(spotify_tracks)
    
    # For users with more history, use the existing recommendation system
    # with additional enrichment from Spotify
    
    # 1. Get recommendations from existing system
    recommended_songs, _ = recommend_songs_combined(user, limit=limit // 2)
    
    # 2. Extract artists and genres from user preferences
    try:
        profile = UserProfile.objects.get(user=user)
        preferences = profile.preferences
        favorite_artists = preferences.get('favorite_artists', [])
        favorite_genres = preferences.get('favorite_genres', [])
    except UserProfile.DoesNotExist:
        favorite_artists = []
        favorite_genres = []
    
    # Get ids of songs we already have
    existing_song_ids = set(song.spotify_id for song in recommended_songs)
    
    # 3. Enrich with artist-based recommendations from Spotify
    spotify_recommendations = []
    
    if favorite_artists:
        # Pick a random artist from top 3 favorites for variety
        artist = random.choice(favorite_artists[:3]) if len(favorite_artists) >= 3 else favorite_artists[0]
        artist_tracks = get_related_spotify_tracks(artist=artist, limit=limit // 4)
        # Only add tracks we don't already have
        for track in artist_tracks:
            if track['spotify_id'] not in existing_song_ids:
                spotify_recommendations.append(track)
                existing_song_ids.add(track['spotify_id'])
    
    # 4. Enrich with genre-based recommendations
    if favorite_genres and len(spotify_recommendations) < limit // 2:
        # Pick a random genre from top 3 favorites
        genre = random.choice(favorite_genres[:3]) if len(favorite_genres) >= 3 else favorite_genres[0]
        genre_tracks = get_related_spotify_tracks(genre=genre, limit=limit // 4)
        # Only add tracks we don't already have
        for track in genre_tracks:
            if track['spotify_id'] not in existing_song_ids:
                spotify_recommendations.append(track)
                existing_song_ids.add(track['spotify_id'])
    
    # 5. Store the Spotify tracks and combine with existing recommendations
    spotify_songs = store_spotify_tracks(spotify_recommendations)
    all_recommendations = list(recommended_songs) + spotify_songs
    
    # 6. Apply diversity to prevent echo chamber
    diverse_recommendations = diversify_recommendations(
        [(song, random.random()) for song in all_recommendations], 
        diversity_factor=0.2
    )
    
    # Return unique recommendations up to the limit
    seen_ids = set()
    unique_recommendations = []
    
    for song, _ in diverse_recommendations:
        if song.id not in seen_ids and len(unique_recommendations) < limit:
            seen_ids.add(song.id)
            unique_recommendations.append(song)
    
    return unique_recommendations


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_song_recommendations(request):
    """
    API endpoint to get personalized song recommendations for the current user
    """
    user = request.user
    limit = int(request.query_params.get('limit', 30))
    
    # Update user preferences based on their actions
    update_preferences_based_on_actions(user)
    
    # Get recommendations using the hybrid approach
    recommended_songs = recommend_songs_hybrid(user, limit=limit)
    
    # Format the response
    recommendations = []
    for song in recommended_songs:
        recommendations.append({
            'id': song.id,
            'spotify_id': song.spotify_id,
            'name': song.name,
            'artist': song.artist,
            'album': song.album,
            'duration': song.duration,
            'genre': song.genre,
            'url': song.url,
            'album_cover': song.album_cover
        })
    
    return Response({
        'status': 'success',
        'count': len(recommendations),
        'recommendations': recommendations
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fetch_and_store_spotify_track(request, track_id):
    """
    Fetch track details from Spotify and store in database
    """
    # Get track details from Spotify
    track_data = get_spotify_track(track_id)
    
    if not track_data:
        return Response({
            'status': 'error',
            'message': 'Failed to fetch track data from Spotify'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if song already exists
    try:
        song = Song.objects.get(spotify_id=track_id)
        # Update song data
        song.name = track_data['name']
        song.artist = track_data['artist']
        song.album = track_data['album']
        song.duration = track_data['duration']
        song.genre = track_data['genre']
        song.url = track_data['url']
        song.album_cover = track_data['album_cover']
        song.save()
    except Song.DoesNotExist:
        # Create new song
        song = Song(
            spotify_id=track_id,
            name=track_data['name'],
            artist=track_data['artist'],
            album=track_data['album'],
            duration=track_data['duration'],
            genre=track_data['genre'],
            url=track_data['url'],
            album_cover=track_data['album_cover']
        )
        song.save()
    
    return Response({
        'status': 'success',
        'message': 'Track fetched and stored successfully',
        'song': {
            'id': song.id,
            'spotify_id': song.spotify_id,
            'name': song.name,
            'artist': song.artist,
            'album': song.album,
            'duration': song.duration,
            'genre': song.genre,
            'url': song.url,
            'album_cover': song.album_cover
        }
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recommend_songs(request):
    """
    Recommend songs based on user's recent activity without requiring a specific track ID.
    Automatically analyzes user behavior to provide personalized recommendations.
    """
    user = request.user
    limit = int(request.query_params.get('limit', 20))
    
    # 1. Determine the base song for recommendations from user's recent activity
    base_track = get_user_base_track(user)
    if not base_track:
        # If we can't determine a base track, return a general recommendation
        return get_general_recommendations(request, limit)
    
    # Calculate how many new vs. existing songs to include
    new_song_ratio = 0.6  # 60% new songs, 40% existing songs
    new_song_limit = int(limit * new_song_ratio)
    existing_song_limit = limit - new_song_limit
    
    # 2. Get similar songs from Spotify based on the base song's artist and genre
    artist = base_track.get('artist')
    genre = base_track.get('genre')
    
    # Handle potential None values
    if artist and genre:
        similar_songs = get_related_spotify_tracks(
            artist=artist, 
            genre=genre, 
            limit=new_song_limit * 2  # Get more than needed to ensure variety
        )
    elif artist:
        similar_songs = get_related_spotify_tracks(
            artist=artist,
            limit=new_song_limit * 2
        )
    elif genre:
        similar_songs = get_related_spotify_tracks(
            genre=genre,
            limit=new_song_limit * 2
        )
    else:
        # If neither artist nor genre are available, get trending tracks
        similar_songs = get_trending_spotify_tracks(limit=new_song_limit * 2)
    
    # Filter out songs that are already in the Song table
    existing_song_ids = set(Song.objects.values_list('spotify_id', flat=True))
    new_songs = [song for song in similar_songs if song.get('spotify_id') and song['spotify_id'] not in existing_song_ids]
    
    # Store the new songs in the database
    stored_new_songs = store_spotify_tracks(new_songs[:new_song_limit])
    
    # 3. Get relevant existing songs from the database
    matching_songs = []
    
    # Find songs with matching artist or genre (safely handle None values)
    query = Q()
    if artist:
        query |= Q(artist__icontains=artist)
    if genre:
        query |= Q(genre__icontains=genre)
    
    if query:
        # Only filter if we have valid criteria
        matching_songs = list(Song.objects.filter(query))
        
        # Exclude the base song and newly added songs
        if base_track.get('spotify_id'):
            matching_songs = [song for song in matching_songs if song.spotify_id != base_track['spotify_id']]
        
        # Exclude newly added songs
        new_song_ids = [song.spotify_id for song in stored_new_songs]
        matching_songs = [song for song in matching_songs if song.spotify_id not in new_song_ids]
    
    # If we don't have enough matching songs, add some based on user preferences
    if len(matching_songs) < existing_song_limit:
        # Get user's favorite genres and artists from their profile or action history
        try:
            profile = UserProfile.objects.get(user=user)
            favorite_artists = profile.preferences.get('favorite_artists', []) or []
            favorite_genres = profile.preferences.get('favorite_genres', []) or []
            
            pref_query = Q()
            if favorite_artists:
                pref_query |= Q(artist__in=favorite_artists)
            if favorite_genres:
                pref_query |= Q(genre__in=favorite_genres)
                
            if pref_query:
                # Find additional songs based on user preferences
                additional_matches = list(Song.objects.filter(pref_query))
                
                # Exclude songs already in matching_songs
                matching_song_ids = [song.id for song in matching_songs]
                additional_matches = [song for song in additional_matches if song.id not in matching_song_ids]
                
                # Exclude the base song
                if base_track.get('spotify_id'):
                    additional_matches = [song for song in additional_matches if song.spotify_id != base_track['spotify_id']]
                
                # Exclude newly added songs
                additional_matches = [song for song in additional_matches if song.spotify_id not in new_song_ids]
                
                matching_songs.extend(additional_matches)
        except UserProfile.DoesNotExist:
            # If no user profile, just get popular songs
            pass
    
    # If we still don't have enough, add some random popular songs
    if len(matching_songs) < existing_song_limit:
        # Get popular songs based on play counts
        popular_songs = Action.objects.filter(
            action_type='play'
        ).values('song').annotate(
            count=Count('id')
        ).order_by('-count')[:existing_song_limit * 2]  # Get more than needed in case of duplicates
        
        if popular_songs:
            popular_song_ids = [item['song'] for item in popular_songs if item.get('song')]
            if popular_song_ids:
                popular_song_objects = list(Song.objects.filter(id__in=popular_song_ids))
                
                # Exclude songs already in matching_songs
                matching_song_ids = [song.id for song in matching_songs]
                popular_song_objects = [song for song in popular_song_objects if song.id not in matching_song_ids]
                
                matching_songs.extend(popular_song_objects)
    
    # Take only the number of existing songs we need
    existing_recommendations = matching_songs[:existing_song_limit]
    
    # Combine both new and existing song recommendations
    all_recommendations = list(stored_new_songs) + list(existing_recommendations)
    
    # Shuffle the recommendations to mix new and existing songs
    random.shuffle(all_recommendations)
    
    # Format the response
    recommendations = []
    for song in all_recommendations:
        recommendation = {
            'id': song.id,
            'spotify_id': song.spotify_id,
            'name': song.name,
            'artist': song.artist,
            'album': song.album,
            'duration': song.duration,
            'genre': song.genre,
            'url': song.url,
            'album_cover': song.album_cover,
            'is_new_discovery': song in stored_new_songs  # Flag to indicate if this is a new discovery
        }
        
        # Only add recommendation basis if we have a valid base track
        if base_track:
            recommendation['recommendation_basis'] = {
                'song': base_track.get('name', 'Unknown'),
                'artist': base_track.get('artist', 'Unknown'),
                'genre': base_track.get('genre', 'Unknown')
            }
            
        recommendations.append(recommendation)
    
    response_data = {
        'status': 'success',
        'count': len(recommendations),
        'new_discoveries': len(stored_new_songs),
        'from_library': len(existing_recommendations),
        'recommendations': recommendations
    }
    
    # Add recommendation basis to response if available
    if base_track:
        response_data['recommendation_basis'] = {
            'song': base_track.get('name', 'Unknown'),
            'artist': base_track.get('artist', 'Unknown')
        }
    
    return Response(response_data, status=status.HTTP_200_OK)

def get_user_base_track(user):
    """
    Determine which track to use as the basis for recommendations.
    Analyzes user's recent activity to find the most relevant track.
    """
    # Strategy 1: Last liked/saved song
    last_liked = Action.objects.filter(
        user=user, 
        action_type__in=['like', 'save'],
        song__isnull=False  # Ensure the song is not null
    ).order_by('-timestamp').first()
    
    if last_liked and last_liked.song:
        song = last_liked.song
        return {
            'spotify_id': song.spotify_id,
            'name': song.name,
            'artist': song.artist,
            'genre': song.genre
        }
    
    # Strategy 2: Most played song in the last week
    one_week_ago = timezone.now() - timezone.timedelta(days=7)
    most_played = Action.objects.filter(
        user=user,
        action_type='play',
        timestamp__gte=one_week_ago,
        song__isnull=False  # Ensure the song is not null
    ).values('song').annotate(
        play_count=Count('id')
    ).order_by('-play_count').first()
    
    if most_played and most_played.get('song'):
        try:
            song = Song.objects.get(id=most_played['song'])
            return {
                'spotify_id': song.spotify_id,
                'name': song.name,
                'artist': song.artist,
                'genre': song.genre
            }
        except Song.DoesNotExist:
            pass
    
    # Strategy 3: Check user's preferred genres/artists and pick a popular song
    try:
        profile = UserProfile.objects.get(user=user)
        favorite_genres = profile.preferences.get('favorite_genres', []) or []
        favorite_artists = profile.preferences.get('favorite_artists', []) or []
        
        query = Q()
        if favorite_genres:
            query |= Q(genre__in=favorite_genres)
        if favorite_artists:
            query |= Q(artist__in=favorite_artists)
            
        if query:
            popular_match = Song.objects.filter(query).annotate(
                play_count=Count('action', filter=Q(action__action_type='play'))
            ).order_by('-play_count').first()
            
            if popular_match:
                return {
                    'spotify_id': popular_match.spotify_id,
                    'name': popular_match.name,
                    'artist': popular_match.artist,
                    'genre': popular_match.genre
                }
    except UserProfile.DoesNotExist:
        pass
    
    # Strategy 4: Fall back to a generally popular song
    popular_song = Song.objects.annotate(
        play_count=Count('action', filter=Q(action__action_type='play'))
    ).order_by('-play_count').first()
    
    if popular_song:
        return {
            'spotify_id': popular_song.spotify_id,
            'name': popular_song.name,
            'artist': popular_song.artist,
            'genre': popular_song.genre
        }
    
    # If all else fails, return None
    return None

def get_general_recommendations(request, limit):
    """
    Fallback function to get general recommendations when no base track can be determined.
    Returns popular and trending songs.
    """
    user = request.user
    
    # Get popular songs from our database
    popular_songs = Song.objects.annotate(
        play_count=Count('action', filter=Q(action__action_type='play'))
    ).order_by('-play_count')[:limit//2]
    
    # Get some trending songs from Spotify
    trending_songs = get_trending_spotify_tracks(limit=limit//2)
    stored_trending = store_spotify_tracks(trending_songs)
    
    # Combine recommendations
    all_recommendations = list(popular_songs) + list(stored_trending)
    random.shuffle(all_recommendations)
    
    # Format the response
    recommendations = []
    for song in all_recommendations:
        recommendations.append({
            'id': song.id,
            'spotify_id': song.spotify_id,
            'name': song.name,
            'artist': song.artist,
            'album': song.album,
            'duration': song.duration,
            'genre': song.genre,
            'url': song.url,
            'album_cover': song.album_cover,
            'is_new_discovery': song in stored_trending
        })
    
    return Response({
        'status': 'success',
        'count': len(recommendations),
        'new_discoveries': len(stored_trending),
        'from_library': len(popular_songs),
        'recommendation_type': 'general',  # Indicate these are general recommendations
        'recommendations': recommendations
    }, status=status.HTTP_200_OK)

# You'll need to implement this function to get trending tracks from Spotify
def get_trending_spotify_tracks(limit=10):
    """
    Get trending tracks from Spotify.
    This is a placeholder - implement the actual API call to Spotify.
    """
    # Implement Spotify API call to get trending tracks
    # This would typically use the Spotify API to get new releases or trending tracks
    
    # Placeholder implementation - should be replaced with actual API call
    return []

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_for_you_recommendations(request):
    """
    API endpoint to get a mix of recommendations for the "For You" page
    """
    user = request.user
    limit = int(request.query_params.get('limit', 50))
    
    # Initialize the recommendations list
    recommendations = []
    
    # 1. Get recommendations for new users if the user has very limited history
    action_count = Action.objects.filter(user=user).count()
    if action_count <= 1:
        new_user_recommendations = get_recommendations_for_new_user(user, limit=limit // 4)
        recommendations.extend(store_spotify_tracks(new_user_recommendations))
    
    # 2. Get personalized recommendations using the hybrid approach
    personalized_recommendations = recommend_songs_hybrid(user, limit=limit // 4)
    recommendations.extend(personalized_recommendations)
    
    # 3. Get trending songs based on recent activity
    recent_date = timezone.now() - timezone.timedelta(days=7)
    trending_songs = Action.objects.filter(
        timestamp__gte=recent_date
    ).values('song').annotate(
        count=Count('id')
    ).order_by('-count')[:limit // 4]
    
    song_ids = [item['song'] for item in trending_songs]
    trending_songs = Song.objects.filter(id__in=song_ids)
    recommendations.extend(trending_songs)
    
    # 4. Get new songs from Spotify that are not in the Song table
    new_songs = get_related_spotify_tracks(limit=limit // 4)
    existing_song_ids = set(Song.objects.values_list('spotify_id', flat=True))
    new_songs = [song for song in new_songs if song['spotify_id'] not in existing_song_ids]
    recommendations.extend(store_spotify_tracks(new_songs))  # Store and add as Song objects for consistency
    
    # Shuffle the recommendations to mix them up
    random.shuffle(recommendations)
    
    # Limit the number of recommendations to the specified limit
    recommendations = recommendations[:limit]
    
    # Format the response
    response_data = []
    for song in recommendations:
        # Handle both Song objects and dictionaries
        if isinstance(song, dict):
            # It's already a dictionary
            response_data.append({
                'spotify_id': song['spotify_id'],
                'name': song['name'],
                'artist': song['artist'],
                'album': song['album'],
                'duration': song['duration'],
                'genre': song['genre'],
                'url': song['url'],
                'album_cover': song['album_cover']
            })
        else:
            # It's a Song object
            response_data.append({
                'spotify_id': song.spotify_id,
                'name': song.name,
                'artist': song.artist,
                'album': song.album,
                'duration': song.duration,
                'genre': song.genre,
                'url': song.url,
                'album_cover': song.album_cover
            })
    
    return Response({
        'status': 'success',
        'count': len(response_data),
        'recommendations': response_data
    }, status=status.HTTP_200_OK)

# recommendations/views.py
import logging
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import requests
import re
import urllib.parse

# Configure logging
logger = logging.getLogger(__name__)

@require_http_methods(["GET"])
def get_recommendations(request, spotify_id):
    """
    Get song recommendations by searching with artist name or genre
    """
    # Validate Spotify ID
    if not re.match(r'^[a-zA-Z0-9]{22}$', spotify_id):
        return JsonResponse({
            'error': 'Invalid Spotify Track ID',
            'details': 'The provided ID does not match the expected Spotify ID format'
        }, status=400)

    # Get access token
    access_token = get_spotify_token()
    if not access_token:
        return JsonResponse({
            'error': 'Authentication Failed',
            'details': 'Unable to obtain Spotify access token'
        }, status=401)

    # Headers for Spotify API requests
    headers = {
        'Authorization': f'Bearer {access_token}'
    }

    try:
        # Fetch track details
        track_response = requests.get(
            f'https://api.spotify.com/v1/tracks/{spotify_id}', 
            headers=headers
        )
        track_response.raise_for_status()
        track = track_response.json()

        # Extract artist information
        if not track.get('artists'):
            return JsonResponse({
                'error': 'No Artist Information',
                'details': 'The track does not have artist information'
            }, status=400)

        artist_id = track['artists'][0]['id']
        artist_name = track['artists'][0]['name']
        track_name = track['name']

        # Get album cover (use the largest available image)
        original_album_cover = max(track['album'].get('images', [{'url': None}]), key=lambda x: x.get('width', 0))['url']

        # Log track and artist details
        logger.info(f"Processing track: {spotify_id}")
        logger.info(f"Artist Name: {artist_name}")

        # Recommendations strategies
        recommendations = []

        # Strategy 1: Search by Artist Name
        try:
            # URL encode the artist name for search
            encoded_artist = urllib.parse.quote(artist_name)
            search_response = requests.get(
                f'https://api.spotify.com/v1/search',
                params={
                    'q': encoded_artist,
                    'type': 'track',
                    'limit': 10
                },
                headers=headers
            )
            search_response.raise_for_status()
            search_results = search_response.json().get('tracks', {}).get('items', [])

            # Filter out the original track
            recommendations = [{
                'id': track['id'],
                'name': track['name'],
                'artist': track['artists'][0]['name'],
                'album': track['album']['name'],
                'preview_url': track.get('preview_url'),
                'album_cover': max(track['album'].get('images', [{'url': None}]), key=lambda x: x.get('width', 0))['url']
            } for track in search_results if track['id'] != spotify_id][:5]

            logger.info(f"Found {len(recommendations)} recommendations by artist search")
        except Exception as e:
            logger.warning(f"Artist name search failed: {e}")

        # Strategy 2: Fetch Artist Details for Genre
        if not recommendations:
            try:
                # Get artist details to get genres
                artist_response = requests.get(
                    f'https://api.spotify.com/v1/artists/{artist_id}', 
                    headers=headers
                )
                artist_response.raise_for_status()
                artist_details = artist_response.json()
                genres = artist_details.get('genres', [])

                # If genres exist, search by genre
                if genres:
                    # Use the first genre for search
                    encoded_genre = urllib.parse.quote(genres[0])
                    genre_search_response = requests.get(
                        f'https://api.spotify.com/v1/search',
                        params={
                            'q': f'genre:"{encoded_genre}"',
                            'type': 'track',
                            'limit': 10
                        },
                        headers=headers
                    )
                    genre_search_response.raise_for_status()
                    genre_search_results = genre_search_response.json().get('tracks', {}).get('items', [])

                    # Filter out the original track
                    recommendations = [{
                        'id': track['id'],
                        'name': track['name'],
                        'artist': track['artists'][0]['name'],
                        'album': track['album']['name'],
                        'preview_url': track.get('preview_url'),
                        'album_cover': max(track['album'].get('images', [{'url': None}]), key=lambda x: x.get('width', 0))['url']
                    } for track in genre_search_results if track['id'] != spotify_id][:5]

                    logger.info(f"Found {len(recommendations)} recommendations by genre search")
            except Exception as e:
                logger.warning(f"Genre search failed: {e}")

        # Prepare response
        response_data = {
            'original_track': {
                'id': spotify_id,
                'name': track_name,
                'artist': artist_name,
                'album_cover': original_album_cover
            },
            'recommendations': recommendations
        }
        
        # Log recommendation status
        if not recommendations:
            logger.warning(f"No recommendations found for track {spotify_id}")
        
        return JsonResponse(response_data, safe=True)

    except requests.exceptions.RequestException as e:
        logger.error(f"Spotify API Request Failed: {e}")
        return JsonResponse({
            'error': 'Spotify API Request Failed',
            'details': str(e),
            'spotify_id': spotify_id
        }, status=500)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({
            'error': 'An unexpected error occurred',
            'details': str(e),
            'spotify_id': spotify_id
        }, status=500)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recommend_friends(request, limit=10):
    """
    Endpoint to recommend potential friends to a user based on music taste similarity.
    Returns users with similar music preferences who are not already friends or have pending requests.
    
    Parameters:
    - request: The HTTP request
    - limit: Maximum number of friend recommendations to return (default: 10)
    
    Returns:
    - JSON response with recommended friends and their similarity scores
    
    Authentication:
    - Requires JWT token in the Authorization header
    """
    user = request.user
    
    # Ensure user similarities are up-to-date
    
    # Get existing friends (users with accepted friend requests)
    existing_friends = FriendRequest.objects.filter(
        (Q(sender=user) | Q(receiver=user)) & Q(status='accepted')
    ).values_list('sender_id', 'receiver_id')
    
    # Create a set of friend IDs
    friend_ids = set()
    for sender_id, receiver_id in existing_friends:
        friend_ids.add(sender_id if sender_id != user.id else receiver_id)
    
    # Get pending friend requests
    pending_requests = FriendRequest.objects.filter(
        (Q(sender=user) | Q(receiver=user)) & Q(status='pending')
    ).values_list('sender_id', 'receiver_id')
    
    # Add pending request users to exclusion list
    pending_user_ids = set()
    for sender_id, receiver_id in pending_requests:
        pending_user_ids.add(sender_id if sender_id != user.id else receiver_id)
    
    # Combine all exclusion IDs (friends, pending requests, and self)
    excluded_ids = friend_ids.union(pending_user_ids, {user.id})
    
    # Get similar users excluding friends, pending requests, and self
    similar_users = UserSimilarity.objects.filter(
        user1=user
    ).exclude(
        user2_id__in=excluded_ids
    ).select_related('user2__profile').order_by('-similarity_score')[:limit]
    
    # Prepare response data
    recommendations = []
    for sim in similar_users:
        # Skip if similarity score is zero or negative
        if sim.similarity_score <= 0:
            continue
            
        try:
            profile = sim.user2.profile
            
            # Get common favorite artists
            user_profile = UserProfile.objects.get(user=user)
            user_favorite_artists = set(user_profile.preferences.get('favorite_artists', []))
            friend_favorite_artists = set(profile.preferences.get('favorite_artists', []))
            common_artists = list(user_favorite_artists.intersection(friend_favorite_artists))
            
            recommendations.append({
                'user_id': sim.user2.id,
                'username': sim.user2.username,
                'name': profile.name or sim.user2.username,
                'profile_picture': request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None,
                'similarity_score': round(sim.similarity_score, 2),
                'common_artists': common_artists[:3],  # Top 3 common artists
                'total_common_artists': len(common_artists)
            })
        except UserProfile.DoesNotExist:
            # Skip users without profiles
            continue
    
    # If no similar users found, recommend random users
    if not recommendations:
        random_users = User.objects.exclude(id__in=excluded_ids).order_by('?')[:limit]
        for random_user in random_users:
            try:
                profile = random_user.profile
                recommendations.append({
                    'user_id': random_user.id,
                    'username': random_user.username,
                    'name': profile.name or random_user.username,
                    'profile_picture': request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None,
                    'similarity_score': None,
                    'common_artists': [],
                    'total_common_artists': 0
                })
            except UserProfile.DoesNotExist:
                # Skip users without profiles
                continue
    
    return Response({
        'recommended_friends': recommendations,
        'total_count': len(recommendations)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recommend_songs_from_friends(request, limit=20):
    """
    Recommend songs based on the similarity score with friends.
    Includes new songs, common songs, and songs your friends listen to.
    """
    user = request.user
    
    # Get similar users (friends) based on similarity score
    similar_users = UserSimilarity.objects.filter(
        user1=user
    ).order_by('-similarity_score').values_list('user2', flat=True)[:limit]
    
    if not similar_users:
        return Response({
            'status': 'error',
            'message': 'No similar users found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get songs liked by these friends
    friend_liked_songs = Action.objects.filter(
        user_id__in=similar_users,
        action_type='like'
    ).values_list('song_id', flat=True)
    
    # Get songs that the user has not already liked
    user_liked_songs = Action.objects.filter(
        user=user,
        action_type='like'
    ).values_list('song_id', flat=True)
    
    recommended_song_ids = set(friend_liked_songs) - set(user_liked_songs)
    
    # Fetch new songs from Spotify that are not already in the Song table
    new_songs = get_related_spotify_tracks(limit=limit)
    existing_song_ids = set(Song.objects.values_list('spotify_id', flat=True))
    new_songs = [song for song in new_songs if song['spotify_id'] not in existing_song_ids]
    
    # Store the new songs in the database
    stored_new_songs = store_spotify_tracks(new_songs)
    
    # Combine the recommendations
    recommended_songs = list(Song.objects.filter(id__in=recommended_song_ids)) + stored_new_songs
    
    # Shuffle the recommendations to mix them up
    random.shuffle(recommended_songs)
    
    # Limit the number of recommendations to the specified limit
    recommended_songs = recommended_songs[:limit]
    
    # Format the response
    response_data = []
    for song in recommended_songs:
        response_data.append({
            'id': song.id,
            'spotify_id': song.spotify_id,
            'name': song.name,
            'artist': song.artist,
            'album': song.album,
            'duration': song.duration,
            'genre': song.genre,
            'url': song.url,
            'album_cover': song.album_cover
        })
    
    return Response({
        'status': 'success',
        'count': len(response_data),
        'recommendations': response_data
    }, status=status.HTTP_200_OK)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recently_played(request):
    """
    Returns a list of songs recently played by the user.
    """
    user = request.user
    limit = int(request.query_params.get('limit', 10))
    days = int(request.query_params.get('days', 30))  # Default to last 30 days
    
    # Calculate the date range
    start_date = timezone.now() - timezone.timedelta(days=days)
    
    # Get distinct songs played by the user in the given time period
    # Order by most recent play
    recent_plays = Action.objects.filter(
        user=user,
        action_type='play',
        song__isnull=False,
        timestamp__gte=start_date
    ).order_by('-timestamp').select_related('song')
    
    # Get distinct songs (the first occurrence of each song is the most recent play)
    seen_songs = set()
    distinct_recent_songs = []
    
    for action in recent_plays:
        if action.song.id not in seen_songs:
            seen_songs.add(action.song.id)
            distinct_recent_songs.append({
                'song': action.song,
                'last_played': action.timestamp
            })
        
        if len(distinct_recent_songs) >= limit:
            break
    
    # Format the response
    song_list = []
    for item in distinct_recent_songs:
        song = item['song']
        song_list.append({
            'id': song.id,
            'spotify_id': song.spotify_id,
            'name': song.name,
            'artist': song.artist,
            'album': song.album,
            'duration': song.duration,
            'genre': song.genre,
            'url': song.url,
            'album_cover': song.album_cover,
            'last_played': item['last_played'].isoformat()
        })
    
    return Response({
        'status': 'success',
        'count': len(song_list),
        'time_period': f"Last {days} days",
        'songs': song_list
    }, status=status.HTTP_200_OK)

from django.db.models import Max

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_most_played(request):
    """
    Returns a list of the user's most played songs.
    """
    user = request.user
    limit = int(request.query_params.get('limit', 10))
    days = int(request.query_params.get('days', 90))  # Default to last 90 days
    
    # Calculate the date range
    start_date = timezone.now() - timezone.timedelta(days=days)
    
    # Get songs played by the user in the given time period
    # Group by song and count plays
    most_played = Action.objects.filter(
        user=user,
        action_type='play',
        song__isnull=False,
        timestamp__gte=start_date
    ).values('song').annotate(
        play_count=Count('id'),
        last_played=Max('timestamp')
    ).order_by('-play_count')[:limit]
    
    # Get the actual song objects
    song_ids = [item['song'] for item in most_played]
    songs = {song.id: song for song in Song.objects.filter(id__in=song_ids)}
    
    # Format the response
    song_list = []
    for item in most_played:
        song_id = item['song']
        if song_id in songs:
            song = songs[song_id]
            song_list.append({
                'id': song.id,
                'spotify_id': song.spotify_id,
                'name': song.name,
                'artist': song.artist,
                'album': song.album,
                'duration': song.duration,
                'genre': song.genre,
                'url': song.url,
                'album_cover': song.album_cover,
                'play_count': item['play_count'],
                'last_played': item['last_played'].isoformat()
            })
    
    return Response({
        'status': 'success',
        'count': len(song_list),
        'time_period': f"Last {days} days",
        'songs': song_list
    }, status=status.HTTP_200_OK)












from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from django.contrib.auth.models import User
from django.core.cache import cache
from django.conf import settings
from django.db import transaction

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

import json
from datetime import datetime

from .models import Song, Action, Recommendation, UserProfile
from .algorithms import (
    recommend_songs_combined, 
    get_trending_songs, 
    cached_get_recommendations,
    diversify_recommendations,
    hybrid_recommendation,
    calculate_svd_recommendations,
    calculate_als_recommendations,
    update_preferences_based_on_actions,
    update_user_similarities
)
from .spotify_utils import (
    get_spotify_track, 
    get_related_spotify_tracks, 
    get_recommendations_for_new_user,
    store_spotify_tracks
)

# JWT Authentication middleware
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed


class RecommendationAPIView(APIView):
    """
    Base class for recommendation views with common methods
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_user_from_request(self, request):
        """Get the authenticated user from the request"""
        return request.user
    
    def format_song_response(self, song):
        """Format a song object to a standard response format"""
        return {
            "id": song.id,
            "spotify_id": song.spotify_id,
            "name": song.name,
            "artist": song.artist,
            "album": song.album,
            "duration": song.duration,
            "album_cover": song.album_cover,
            "genre": song.genre if hasattr(song, 'genre') else None,
            "url": song.spotify_url if hasattr(song, 'spotify_url') else song.url
        }


class ForYouRecommendationsView(RecommendationAPIView):
    """
    Endpoint for personalized 'For You' recommendations using various algorithms
    """
    
    def get(self, request):
        user = self.get_user_from_request(request)
        limit = int(request.query_params.get('limit', 20))
        algorithm = request.query_params.get('algorithm', 'hybrid')
        
        # Check if user is new or has limited interactions
        action_count = Action.objects.filter(user=user).count()
        
        if action_count < 3:
            # For new users with limited history, use the specialized method
            track_data = get_recommendations_for_new_user(user, limit)
            songs = store_spotify_tracks(track_data)
            recommendation_source = "new_user"
        else:
            # Update user preferences based on actions before getting recommendations
            update_preferences_based_on_actions(user)
            
            # Choose recommendation algorithm based on request or user profile
            if algorithm == 'hybrid':
                songs, recommendation_source = hybrid_recommendation(user, limit)
            elif algorithm == 'als':
                songs = cached_get_recommendations(user, limit, algorithm='als')
                recommendation_source = "als"
            elif algorithm == 'svd':
                songs = cached_get_recommendations(user, limit, algorithm='svd')
                recommendation_source = "svd"
            elif algorithm == 'collaborative':
                songs, _ = recommend_songs_combined(user, limit)
                recommendation_source = "collaborative"
            else:
                # Default to hybrid
                songs, recommendation_source = hybrid_recommendation(user, limit)
            
            # Add diversity to recommendations
            song_scores = [(song, 1.0) for song in songs]  # Simple scoring for diversification
            songs = [s for s, _ in diversify_recommendations(song_scores)]
        
        # Format the response
        response_data = {
            "recommendations": [self.format_song_response(song) for song in songs],
            "algorithm": recommendation_source,
            "limit": limit
        }
        
        return Response(response_data)


class TrendingSongsView(RecommendationAPIView):
    """
    Endpoint for getting trending songs based on recent activity
    """
    
    def get(self, request):
        days = int(request.query_params.get('days', 7))
        limit = int(request.query_params.get('limit', 20))
        
        # Get trending songs
        trending_songs = get_trending_songs(days=days, limit=limit)
        
        # Format the response
        response_data = {
            "trending": [self.format_song_response(song) for song in trending_songs],
            "time_period_days": days,
            "limit": limit
        }
        
        return Response(response_data)


class SimilarSongsView(RecommendationAPIView):
    """
    Get songs similar to a given song (by spotify_id)
    """
    
    def get(self, request):
        spotify_id = request.query_params.get('spotify_id')
        limit = int(request.query_params.get('limit', 10))
        
        if not spotify_id:
            return Response({"error": "spotify_id parameter is required"}, status=400)
            
        try:
            # First check if the song exists in our database
            try:
                song = Song.objects.get(spotify_id=spotify_id)
                artist = song.artist
                genre = song.genre
            except Song.DoesNotExist:
                # If not, fetch it from Spotify
                track_data = get_spotify_track(spotify_id)
                if track_data:
                    artist = track_data['artist']
                    genre = track_data['genre']
                else:
                    return Response({"error": "Song not found"}, status=404)
            
            # Get similar tracks from Spotify
            related_tracks = get_related_spotify_tracks(artist=artist, genre=genre, limit=limit)
            
            # Store tracks in our database and return them
            if related_tracks:
                similar_songs = store_spotify_tracks(related_tracks)
                response_data = {
                    "similar_songs": [self.format_song_response(song) for song in similar_songs],
                    "source": "spotify",
                    "limit": limit
                }
                return Response(response_data)
            else:
                return Response({"error": "No similar songs found"}, status=404)
                
        except ValueError as e:
            return Response({"error": str(e)}, status=400)


class NewTracksRecommendationView(RecommendationAPIView):
    """
    Endpoint for recommending new tracks the user hasn't interacted with
    """
    
    def get(self, request):
        user = self.get_user_from_request(request)
        limit = int(request.query_params.get('limit', 20))
        
        # Get all song IDs the user has interacted with
        user_song_ids = set(Action.objects.filter(user=user).values_list('song_id', flat=True))
        
        # Get recommended songs using the hybrid algorithm
        recommended_songs, algorithm = hybrid_recommendation(user, limit=limit*2)
        
        # Filter out songs the user has already interacted with
        new_songs = [song for song in recommended_songs if song.id not in user_song_ids]
        
        # If we don't have enough recommendations, fetch some from Spotify
        if len(new_songs) < limit:
            # Try to get user preferences
            try:
                profile = UserProfile.objects.get(user=user)
                preferences = profile.preferences
                
                # Get favorite genres or artists
                favorite_genres = preferences.get('favorite_genres', [])
                favorite_artists = preferences.get('favorite_artists', [])
                
                if favorite_artists:
                    spotify_tracks = get_related_spotify_tracks(artist=favorite_artists[0], limit=limit)
                elif favorite_genres:
                    spotify_tracks = get_related_spotify_tracks(genre=favorite_genres[0], limit=limit)
                else:
                    spotify_tracks = get_related_spotify_tracks(limit=limit)
                    
                # Store and add these tracks
                spotify_songs = store_spotify_tracks(spotify_tracks)
                
                # Add only songs that the user hasn't interacted with
                for song in spotify_songs:
                    if song.id not in user_song_ids and song not in new_songs:
                        new_songs.append(song)
                        
                        # If we have enough songs, break
                        if len(new_songs) >= limit:
                            break
                            
            except UserProfile.DoesNotExist:
                pass
        
        # Format the response
        response_data = {
            "new_recommendations": [self.format_song_response(song) for song in new_songs[:limit]],
            "algorithm": f"{algorithm}_with_spotify",
            "limit": limit
        }
        
        return Response(response_data)


class UserBasedRecommendationView(RecommendationAPIView):
    """
    Get recommendations based on similar users' preferences
    """
    
    def get(self, request):
        user = self.get_user_from_request(request)
        limit = int(request.query_params.get('limit', 20))
        
        # Update user similarities to get fresh recommendations
        update_user_similarities(user)
        
        # Get recommendations using collaborative filtering
        songs, _ = recommend_songs_collaborative(user, limit)
        
        # Format the response
        response_data = {
            "recommendations": [self.format_song_response(song) for song in songs],
            "algorithm": "collaborative_filtering",
            "limit": limit
        }
        
        return Response(response_data)


class MatrixFactorizationRecommendationView(RecommendationAPIView):
    """
    Get recommendations using matrix factorization techniques (SVD or ALS)
    """
    
    def get(self, request):
        user = self.get_user_from_request(request)
        limit = int(request.query_params.get('limit', 20))
        algorithm = request.query_params.get('algorithm', 'svd')  # 'svd' or 'als'
        
        if algorithm.lower() == 'als':
            songs = calculate_als_recommendations(user, limit)
            algorithm_name = "Alternating Least Squares"
        else:
            songs = calculate_svd_recommendations(user, limit)
            algorithm_name = "Singular Value Decomposition"
        
        # Format the response
        response_data = {
            "recommendations": [self.format_song_response(song) for song in songs],
            "algorithm": algorithm_name,
            "limit": limit
        }
        
        return Response(response_data)


class ActionLoggingView(APIView):
    """
    Endpoint for logging user actions with songs (play, like, save, share)
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    @method_decorator(csrf_exempt)
    def post(self, request):
        user = request.user
        data = json.loads(request.body)
        
        song_id = data.get('song_id')
        spotify_id = data.get('spotify_id')
        action_type = data.get('action_type')
        
        if not action_type or (not song_id and not spotify_id):
            return Response({"error": "Missing required parameters"}, status=400)
            
        if action_type not in ['play', 'like', 'save', 'share']:
            return Response({"error": "Invalid action type"}, status=400)
        
        try:
            # Find or create the song
            if song_id:
                song = Song.objects.get(id=song_id)
            elif spotify_id:
                try:
                    song = Song.objects.get(spotify_id=spotify_id)
                except Song.DoesNotExist:
                    # Fetch song data from Spotify and create it
                    track_data = get_spotify_track(spotify_id)
                    if not track_data:
                        return Response({"error": "Song not found on Spotify"}, status=404)
                        
                    song = Song.objects.create(
                        spotify_id=spotify_id,
                        name=track_data['name'],
                        artist=track_data['artist'],
                        album=track_data['album'],
                        duration=track_data['duration'],
                        spotify_url=track_data['url'],
                        album_cover=track_data['album_cover'],
                        genre=track_data['genre']
                    )
            
            # Create the action
            Action.objects.create(
                user=user,
                song=song,
                action_type=action_type,
                timestamp=datetime.now()
            )
            
            # Update user preferences based on this new action
            update_preferences_based_on_actions(user)
            
            # Trigger similarity updates for collaborative filtering (can be done asynchronously)
            # Note: In production, consider making this a background task
            update_user_similarities(user)
            
            return Response({"success": True, "message": f"{action_type} action logged successfully"})
            
        except Song.DoesNotExist:
            return Response({"error": "Song not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


# Specialized endpoint for new users with no interaction history
class NewUserRecommendationView(RecommendationAPIView):
    """
    Get recommendations for brand new users with no interaction history
    """
    
    def get(self, request):
        user = self.get_user_from_request(request)
        limit = int(request.query_params.get('limit', 20))
        
        # Check for optional genre/artist preferences
        genre = request.query_params.get('genre')
        artist = request.query_params.get('artist')
        
        # Fetch recommendations from Spotify
        if genre:
            track_data = get_related_spotify_tracks(genre=genre, limit=limit)
            source = f"genre_{genre}"
        elif artist:
            track_data = get_related_spotify_tracks(artist=artist, limit=limit)
            source = f"artist_{artist}"
        else:
            # Get popular tracks
            track_data = get_related_spotify_tracks(limit=limit)
            source = "popular"
        
        # Store tracks in our database
        songs = store_spotify_tracks(track_data)
        
        # Format the response
        response_data = {
            "recommendations": [self.format_song_response(song) for song in songs],
            "source": source,
            "limit": limit
        }
        
        return Response(response_data)

