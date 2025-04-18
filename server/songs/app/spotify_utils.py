import requests
import logging
from django.utils import timezone
from datetime import datetime, timedelta
from django.conf import settings
import re
from .models import Song
import requests
from .models import Song, UserProfile, Action
from django.utils import timezone 
from datetime import datetime, timedelta
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.views import View
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.cache.backends.base import DEFAULT_TIMEOUT
from django.conf import settings
from django.db import models
# Set up logging
logger = logging.getLogger(__name__)

# Cache in memory - consider using Redis instead for persistence
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
def validate_spotify_id(spotify_track_id):
    """
    Validate Spotify ID format to prevent injection attacks
    """
    if not spotify_track_id or not isinstance(spotify_track_id, str):
        return False
    
    # Spotify IDs are typically 22 characters of base62 (alphanumeric)
    pattern = r'^[a-zA-Z0-9]{22}$'
    return bool(re.match(pattern, spotify_track_id))

def get_spotify_track(spotify_track_id):
    """
    Securely fetch track details from Spotify API using track ID
    """
    # Validate and sanitize input
    spotify_track_id = spotify_track_id.strip() if spotify_track_id else None
    logger.info(f"Getting track for ID: {spotify_track_id}")
    
    # Validate Spotify ID format first
    if not validate_spotify_id(spotify_track_id):
        error_details = {
            "error": "Invalid Spotify Track ID",
            "details": "The ID format is invalid or contains disallowed characters"
        }
        logger.error(f"Spotify ID validation error: {error_details}")
        raise ValueError(error_details)
    
    # Get access token
    access_token = get_spotify_token()
    if not access_token:
        logger.error("No access token available")
        return None
    
    # Fetch track details with proper error handling
    track_url = f"https://api.spotify.com/v1/tracks/{spotify_track_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        response = requests.get(track_url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            logger.error(f"Spotify API error: {response.status_code} - {response.text}")
            return None
        
        track_data = response.json()
        
        # Get album cover (selecting the largest image if available)
        album_cover_url = track_data['album']['images'][0]['url'] if track_data['album']['images'] else None
        
        # Extract artist details
        artist_id = track_data['artists'][0]['id'] if track_data['artists'] else None
        
        genre = None
        if artist_id:
            # Fetch artist details to get genre
            artist_url = f"https://api.spotify.com/v1/artists/{artist_id}"
            artist_response = requests.get(artist_url, headers=headers, timeout=10)
            if artist_response.status_code == 200:
                artist_data = artist_response.json()
                genre = ", ".join(artist_data.get("genres", []))
        
        # Construct final track details
        data = {
            "name": track_data['name'],
            "artist": ", ".join(artist['name'] for artist in track_data['artists']),
            "album": track_data['album']['name'],
            "duration": track_data['duration_ms'] // 1000,
            "url": track_data['external_urls']['spotify'],
            "album_cover": album_cover_url,
            "genre": genre
        }
        
        logger.info(f"Successfully retrieved track: {data['name']} by {data['artist']}")
        return data
        
    except requests.exceptions.RequestException as e:
        logger.exception(f"Request exception in get_spotify_track: {str(e)}")
        return None
    except Exception as e:
        logger.exception(f"Exception in get_spotify_track: {str(e)}")
        if isinstance(e, ValueError):
            raise
        return None
    

def store_spotify_tracks(tracks):
    """
    Store Spotify tracks in the database if they don't exist
    """
    stored_tracks = []
    
    for track_data in tracks:
        # Check if song already exists in database
        try:
            song = Song.objects.get(spotify_id=track_data['spotify_id'])
        except Song.DoesNotExist:
            # Create new song
            song = Song(
                spotify_id=track_data['spotify_id'],
                name=track_data['name'],
                artist=track_data['artist'],
                album=track_data['album'],
                duration=track_data['duration'],
                genre=track_data['genre'],
                url=track_data['url'],
                album_cover=track_data['album_cover']
            )
            song.save()
        
        stored_tracks.append(song)
    
    return stored_tracks




def get_related_spotify_tracks(artist=None, genre=None, limit=30):
    """
    Fetch related tracks from Spotify based on artist or genre
    """
    access_token = get_spotify_token()
    if not access_token:
        return []
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # If we have an artist, search for their tracks
    if artist:
        # First, search for the artist ID
        search_url = f"https://api.spotify.com/v1/search?q={artist}&type=artist&limit=3"
        response = requests.get(search_url, headers=headers)
        
        if response.status_code == 200 and response.json()['artists']['items']:
            artist_id = response.json()['artists']['items'][0]['id']
            
            # Get top tracks for this artist
            tracks_url = f"https://api.spotify.com/v1/artists/{artist_id}/top-tracks?market=US"
            tracks_response = requests.get(tracks_url, headers=headers)
            
            if tracks_response.status_code == 200:
                tracks = tracks_response.json()['tracks'][:limit]
                return [
                    {
                        "spotify_id": track['id'],
                        "name": track['name'],
                        "artist": ", ".join(artist['name'] for artist in track['artists']),
                        "album": track['album']['name'],
                        "duration": track['duration_ms'] // 1000,
                        "url": track['external_urls']['spotify'],
                        "album_cover": track['album']['images'][0]['url'] if track['album']['images'] else None,
                        "genre": None  # We don't get genre from this endpoint
                    }
                    for track in tracks
                ]
    
    # If we have genre or artist search failed, search by genre or artist name as keyword
    search_term = genre if genre else artist if artist else "popular"
    search_url = f"https://api.spotify.com/v1/search?q={search_term}&type=track&limit={limit}"
    
    response = requests.get(search_url, headers=headers)
    
    if response.status_code == 200:
        tracks = response.json()['tracks']['items']
        return [
            {
                "spotify_id": track['id'],
                "name": track['name'],
                "artist": ", ".join(artist['name'] for artist in track['artists']),
                "album": track['album']['name'],
                "duration": track['duration_ms'] // 1000,
                "url": track['external_urls']['spotify'],
                "album_cover": track['album']['images'][0]['url'] if track['album']['images'] else None,
                "genre": None  # We don't get genre from this endpoint
            }
            for track in tracks
        ]
    
    return []

def get_recommendations_for_new_user(user, limit=20):
    """
    Get recommendations for a user with very limited history (1 or 0 songs)
    """
    # Check if user has any actions
    user_actions = Action.objects.filter(user=user)
    action_count = user_actions.count()
    
    # If user has exactly one song interaction
    if action_count == 1:
        action = user_actions.first()
        
        # Get the song
        song = action.song
        
        # Get recommendations based on this single song's artist or genre
        if song.artist:
            return get_related_spotify_tracks(artist=song.artist, limit=limit)
        elif song.genre:
            return get_related_spotify_tracks(genre=song.genre, limit=limit)
    
    # If user has no history, use profile preferences if available
    try:
        profile = UserProfile.objects.get(user=user)
        preferences = profile.preferences
        
        # Check for favorite artists in preferences
        favorite_artists = preferences.get('favorite_artists', [])
        if favorite_artists:
            return get_related_spotify_tracks(artist=favorite_artists[0], limit=limit)
            
        # Check for favorite genres in preferences
        favorite_genres = preferences.get('favorite_genres', [])
        if favorite_genres:
            return get_related_spotify_tracks(genre=favorite_genres[0], limit=limit)
            
    except UserProfile.DoesNotExist:
        pass
    
    # If nothing else, return popular tracks
    return get_related_spotify_tracks(limit=limit) 

