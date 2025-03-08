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

from .models import EsewaPayment

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
    """Handles user signup"""
   
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format'}, status=400)
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
    


@csrf_exempt
def initiate_payment(request):
    try:
        # Generate a unique transaction ID (you should store this in your database)
        transaction_id = "123456"  # In a real app, generate a unique ID
        
        # Payment data
        amount = 100  # Amount in NPR
        
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
        
        # Redirect the user directly to eSewa
        return redirect(payment_url)
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def payment_success(request):
    try:
        # Get parameters from eSewa response
        ref_id = request.GET.get('refId', '')
        transaction_id = request.GET.get('oid', '')
        amount = request.GET.get('amt', '')

        # In a real app, verify this payment with eSewa using their verification API
        verification_data = {
            "merchantId": settings.ESEWA_CONFIG["MERCHANT_ID"],
            "refId": ref_id,
            "amount": amount,
            "transaction_uuid": transaction_id,
        }

        # Optional: Verify the transaction with eSewa's verification API
        # verify_response = requests.get(settings.ESEWA_CONFIG["VERIFY_URL"], params=verification_data)
        
        # Assuming the payment is successful, you can update the transaction status in the database here
        # You could store these details for later reference

        return JsonResponse({
            'status': 'success',
            'ref_id': ref_id,
            'transaction_id': transaction_id,
            'amount': amount
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def payment_failure(request):
    # Handle failed payment
    return JsonResponse({
        'status': 'failed',
        'message': 'Payment was not successful'
    })

@csrf_exempt
def verify_payment(request):
    try:
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
        verify_response = requests.get(settings.ESEWA_CONFIG["VERIFY_URL"], params=verification_data)

        # Return the verification result as JSON
        return JsonResponse(verify_response.json(), safe=False)
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
@csrf_exempt
def like_song(request, spotify_track_id):
    # Handle JWT authentication
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    print("Auth header:", auth_header)  # Debug print
    
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        print("Token extracted:", token[:10] + "...")  # Print first part of token
        
        try:
            # Verify the JWT token manually
            import jwt
            from django.conf import settings
            from django.contrib.auth.models import User
            
            # Decode the JWT token
            # Make sure to use the same secret key that was used to create the token
            decoded_token = jwt.decode(
                token, 
                settings.SECRET_KEY,  # Use your project's SECRET_KEY
                algorithms=["HS256"]
            )
            
            print("Decoded token:", decoded_token)  # Debug print
            
            # Extract user_id from the decoded token
            user_id = decoded_token.get('user_id')
            if not user_id:
                return JsonResponse({'status': 'error', 'message': 'Invalid token format'}, status=400)
            
            # Get the user from the database
            try:
                user = User.objects.get(id=user_id)
                print(f"User found: {user.username}")  # Debug print
            except User.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': 'User not found'}, status=400)
            
            # Get or create the song
            try:
                song = Song.objects.get(spotify_id=spotify_track_id)
            except Song.DoesNotExist:
                # Create the song if it doesn't exist
                song = Song.objects.create(
                    spotify_id=spotify_track_id,
                    name="Unknown Song",  # Replace with actual data
                    artist="Unknown Artist",
                    album="Unknown Album"
                )
                print(f"Created new song with ID: {song.spotify_id}")  # Debug print
            
            # Track the like action
            action, created = Action.objects.get_or_create(
                user=user,
                song=song,
                action_type='like'
            )
            
            message = 'Song liked successfully' if created else 'Song was already liked'
            return JsonResponse({'status': 'success', 'message': message})
            
        except jwt.ExpiredSignatureError:
            return JsonResponse({'status': 'error', 'message': 'Token has expired'}, status=401)
        except jwt.InvalidTokenError as e:
            print(f"Invalid token error: {str(e)}")
            return JsonResponse({'status': 'error', 'message': 'Invalid token'}, status=401)
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return JsonResponse({'status': 'error', 'message': f'Authentication error: {str(e)}'}, status=400)
    
    # If we get here, no valid Bearer token was provided
    return JsonResponse({'status': 'error', 'message': 'You need to be logged in to like a song. Bearer token required.'}, status=400)
@csrf_exempt
@login_required
def save_song(request, song_id):
    song = get_object_or_404(Song, id=song_id)  # Get the song by its ID

    if request.user.is_authenticated:
        # Track the "save" action
        Action.objects.create(
            user=request.user,
            song=song,
            action_type='save'
        )
        return JsonResponse({'status': 'success', 'message': 'Song saved successfully.'})
    else:
        return JsonResponse({'status': 'error', 'message': 'You need to be logged in to save a song.'}, status=400)
    

@csrf_exempt
@login_required
def play_song(request, song_id):
    song = get_object_or_404(Song, id=song_id)  # Get the song by its ID

    if request.user.is_authenticated:
        # Track the "play" action
        Action.objects.create(
            user=request.user,
            song=song,
            action_type='play'
        )
        return JsonResponse({'status': 'success', 'message': 'Song played successfully.'})
    else:
        return JsonResponse({'status': 'error', 'message': 'You need to be logged in to play a song.'}, status=400)
    
@csrf_exempt
@login_required
def skip_song(request, song_id):
    song = get_object_or_404(Song, id=song_id)  # Get the song by its ID

    if request.user.is_authenticated:
        # Track the "skip" action
        Action.objects.create(
            user=request.user,
            song=song,
            action_type='skip'
        )
        return JsonResponse({'status': 'success', 'message': 'Song skipped successfully.'})
    else:
        return JsonResponse({'status': 'error', 'message': 'You need to be logged in to skip a song.'}, status=400)


@csrf_exempt
@login_required
def fetch_song_data(request, track_id):
    # Initialize the Spotify client
    sp = spotipy.Spotify(auth_manager=SpotifyOAuth(client_id="your_client_id",
                                                   client_secret="your_client_secret",
                                                   redirect_uri="your_redirect_uri",
                                                   scope=["user-library-read"]))

    try:
        # Fetch song data by Spotify track ID
        track = sp.track(track_id)

        # Extract relevant details
        song_data = {
            'spotify_id': track['id'],
            'name': track['name'],
            'artist': track['artists'][0]['name'],
            'album': track['album']['name'],
            'album_image': track['album']['images'][0]['url'],  # First image is usually the highest resolution
            'release_date': track['album']['release_date'],
            'url': track['external_urls']['spotify']
        }

        # Store this data in your Django model (optional, based on your needs)
        song = Song.objects.create(**song_data)

        # Return the song data as a JSON response
        return JsonResponse({'status': 'success', 'song': song_data}, status=200)

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    



sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id="your_client_id",
    client_secret="your_client_secret",
    redirect_uri="http://localhost:8000/callback/",  # Ensure it matches exactly
    scope=["user-library-read"]
))

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
            print(song_name)
            song_artist = track_data['artists'][0]['name']
            print(song_artist)
            song_album = track_data['album']['name']
            print(song_album)
            song_duration = track_data['duration_ms'] / 1000  # Convert milliseconds to seconds
            print(song_duration)

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
