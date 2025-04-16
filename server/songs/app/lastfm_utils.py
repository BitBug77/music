import requests
from django.conf import settings

# Store this in your settings.py or as an environment variable
LASTFM_API_KEY = '896578847a2a7c3538dc06b36ddf6168'
LASTFM_BASE_URL = 'http://ws.audioscrobbler.com/2.0/'

def get_top_tracks(period='weekly', limit=10):
    """
    Fetch top tracks from Last.fm API
    period: overall | 7day | 1month | 3month | 6month | 12month
    """
    params = {
        'method': 'chart.getTopTracks',
        'api_key': LASTFM_API_KEY,
        'format': 'json',
        'limit': limit
    }
    
    response = requests.get(LASTFM_BASE_URL, params=params)
    if response.status_code == 200:
        data = response.json()
        return data.get('tracks', {}).get('track', [])
    return []

def get_artist_top_tracks(artist_name, period='weekly', limit=10):
    """
    Fetch top tracks for a specific artist
    period: overall | 7day | 1month | 3month | 6month | 12month
    """
    params = {
        'method': 'artist.getTopTracks',
        'artist': artist_name,
        'api_key': LASTFM_API_KEY,
        'format': 'json',
        'limit': limit,
        'period': period
    }
    
    response = requests.get(LASTFM_BASE_URL, params=params)
    if response.status_code == 200:
        data = response.json()
        return data.get('toptracks', {}).get('track', [])
    return []

def format_track_data(track):
    """
    Format Last.fm track data to match your Song model structure
    """
    return {
        'name': track.get('name', ''),
        'artist': track.get('artist', {}).get('name', ''),
        'album': track.get('album', {}).get('title', '') if 'album' in track else '',
        'album_cover': track.get('image', [{}])[-1].get('#text', '') if 'image' in track else '',
        'url': track.get('url', ''),
        'duration': int(track.get('duration', 0)) if track.get('duration') else 0,
        'listeners': int(track.get('listeners', 0)) if track.get('listeners') else 0,
        'playcount': int(track.get('playcount', 0)) if track.get('playcount') else 0,
        # Last.fm doesn't provide genre in this API
        'genre': ''
    }