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

    client_creds = f"{client_id}:{client_secret}"
    client_creds_b64 = base64.b64encode(client_creds.encode()).decode()

    headers = {"Authorization": f"Basic {client_creds_b64}", "Content-Type": "application/x-www-form-urlencoded"}
    data = {"grant_type": "client_credentials"}

    response = requests.post(token_url, headers=headers, data=data)
    token_info = response.json()

    return token_info.get("access_token"), token_info.get("refresh_token")


def refresh_spotify_token(refresh_token):
    """Refreshes the access token using the refresh token"""
    client_id = settings.SPOTIFY_CLIENT_ID
    client_secret = settings.SPOTIFY_CLIENT_SECRET
    token_url = "https://accounts.spotify.com/api/token"

    client_creds = f"{client_id}:{client_secret}"
    client_creds_b64 = base64.b64encode(client_creds.encode()).decode()

    headers = {"Authorization": f"Basic {client_creds_b64}", "Content-Type": "application/x-www-form-urlencoded"}
    data = {"grant_type": "refresh_token", "refresh_token": refresh_token}

    response = requests.post(token_url, headers=headers, data=data)
    if response.status_code != 200:
        return None

    token_info = response.json()
    return token_info.get("access_token")


@login_required
def recommended_songs(request):
    """Returns recommended songs based on collaborative and content-based filtering"""
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


def calculate_recommendation_score(user, song):
    """Calculates the recommendation score for a given song and user"""
    score = 0

    actions = Action.objects.filter(user=user, song=song)
    for action in actions:
        if action.action_type == 'like':
            score += 10
        elif action.action_type == 'save':
            score += 5
        elif action.action_type == 'play':
            score += 1

    user_profile = UserProfile.objects.get(user=user)
    if song.artist in user_profile.preferences.get('favorite_artists', []):
        score += 5

    recommendation, created = Recommendation.objects.get_or_create(user=user, song=song)
    recommendation.recommendation_score = score
    recommendation.save()

    similar_users = get_similar_users(user)
    for similar_user, similarity_score in similar_users:
        similar_user_actions = Action.objects.filter(user=similar_user, song=song)

        for similar_user_action in similar_user_actions:
            if similar_user_action.action_type == 'like':
                score += similarity_score * 10
            elif similar_user_action.action_type == 'save':
                score += similarity_score * 5
            elif similar_user_action.action_type == 'play':
                score += similarity_score * 1

    recommendation.recommendation_score = score
    recommendation.save()


def calculate_user_similarity(user1, user2):
    """Calculates similarity score between two users based on their actions"""
    user1_actions = Action.objects.filter(user=user1)
    user2_actions = Action.objects.filter(user=user2)

    common_songs = set(user1_actions.values_list('song', flat=True)) & set(user2_actions.values_list('song', flat=True))
    if not common_songs:
        return 0

    numerator = sum([1 for song in common_songs])
    denominator = math.sqrt(len(user1_actions) * len(user2_actions))

    return numerator / denominator if denominator != 0 else 0


def get_similar_users(user, top_n=5):
    """Gets the top N most similar users to the given user"""
    other_users = User.objects.exclude(id=user.id)
    user_similarities = []

    for other_user in other_users:
        similarity_score = calculate_user_similarity(user, other_user)
        user_similarities.append((other_user, similarity_score))

    user_similarities.sort(key=lambda x: x[1], reverse=True)
    return user_similarities[:top_n]
