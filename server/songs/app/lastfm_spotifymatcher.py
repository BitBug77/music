import requests
import logging
from difflib import SequenceMatcher

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_spotify_token(client_id, client_secret):
    """Get Spotify API access token"""
    auth_response = requests.post(
        'https://accounts.spotify.com/api/token',
        data={
            'grant_type': 'client_credentials',
        },
        auth=(client_id, client_secret)
    )
    
    if auth_response.status_code == 200:
        auth_data = auth_response.json()
        return auth_data['access_token']
    else:
        logger.error(f"Failed to get Spotify token: {auth_response.text}")
        return None

def search_spotify_track(track_name, artist_name, access_token):
    """Search for a track on Spotify by name and artist"""
    # URL encode the query
    query = f"track:{track_name} artist:{artist_name}"
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    search_url = f"https://api.spotify.com/v1/search?q={query}&type=track&limit=5"
    
    try:
        response = requests.get(search_url, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Spotify API error: {response.status_code} - {response.text}")
            return None
        
        results = response.json()
        
        # Check if we got any tracks
        if not results['tracks']['items']:
            logger.warning(f"No Spotify tracks found for {track_name} by {artist_name}")
            return None
        
        # Find the best match by comparing track and artist names
        best_match = None
        highest_score = 0
        
        for track in results['tracks']['items']:
            # Calculate similarity scores
            track_similarity = SequenceMatcher(None, track_name.lower(), track['name'].lower()).ratio()
            
            # Get all artists from the track
            track_artists = [artist['name'].lower() for artist in track['artists']]
            
            # Find the best artist match
            artist_similarity = max([SequenceMatcher(None, artist_name.lower(), a).ratio() for a in track_artists])
            
            # Combined score (weighted more towards artist match)
            combined_score = (track_similarity * 0.4) + (artist_similarity * 0.6)
            
            if combined_score > highest_score:
                highest_score = combined_score
                best_match = track
        
        # Only return if we have a reasonably good match
        if highest_score > 0.6:
            return {
                'spotify_id': best_match['id'],
                'name': best_match['name'],
                'artist': ", ".join(artist['name'] for artist in best_match['artists']),
                'album': best_match['album']['name'],  # Make sure album name is included
                'album_cover': best_match['album']['images'][0]['url'] if best_match['album']['images'] else None,
                'duration': best_match['duration_ms'] // 1000,
                'url': best_match['external_urls']['spotify'],
                'match_score': highest_score
            }
        else:
            logger.warning(f"No good match found for {track_name} by {artist_name} (best score: {highest_score})")
            return None
            
    except Exception as e:
        logger.exception(f"Error searching Spotify: {str(e)}")
        return None

def get_spotify_track_details(spotify_id, access_token):
    """Get detailed track information directly from Spotify using the track ID"""
    if not spotify_id:
        return None
        
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    track_url = f"https://api.spotify.com/v1/tracks/{spotify_id}"
    
    try:
        response = requests.get(track_url, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Spotify API error: {response.status_code} - {response.text}")
            return None
            
        track_data = response.json()
        
        return {
            'spotify_id': track_data['id'],
            'name': track_data['name'],
            'artist': ", ".join(artist['name'] for artist in track_data['artists']),
            'album': track_data['album']['name'],  # Album name is always included here
            'album_cover': track_data['album']['images'][0]['url'] if track_data['album']['images'] else None,
            'duration': track_data['duration_ms'] // 1000,
            'url': track_data['external_urls']['spotify']
        }
        
    except Exception as e:
        logger.exception(f"Error getting Spotify track details: {str(e)}")
        return None

def match_lastfm_to_spotify(lastfm_tracks, client_id, client_secret):
    """Match a list of Last.fm tracks to Spotify tracks"""
    # Get Spotify token
    access_token = get_spotify_token(client_id, client_secret)
    if not access_token:
        return []
    
    matched_tracks = []
    
    for track in lastfm_tracks:
        # Extract track name and artist from Last.fm data
        track_name = track.get('name', '')
        artist_name = track.get('artist', {}).get('name', '') if isinstance(track.get('artist'), dict) else track.get('artist', '')
        
        # Skip if missing essential data
        if not track_name or not artist_name:
            continue
        
        # Search for matching Spotify track
        spotify_track = search_spotify_track(track_name, artist_name, access_token)
        
        if spotify_track:
            # Combine Last.fm and Spotify data
            combined_track = {
                **track,  # Original Last.fm data
                'spotify_id': spotify_track['spotify_id'],
                'spotify_url': spotify_track['url'],
                'album': spotify_track['album'],  # Make sure album is included
                'album_cover': spotify_track['album_cover'] or track.get('album_cover', ''),
                'duration': spotify_track['duration'] or track.get('duration', 0),
            }
            matched_tracks.append(combined_track)
    
    return matched_tracks

def update_tracks_with_spotify_details(tracks, client_id, client_secret):
    """Update tracks that already have Spotify IDs with complete details"""
    # Get Spotify token
    access_token = get_spotify_token(client_id, client_secret)
    if not access_token:
        return tracks
    
    updated_tracks = []
    
    for track in tracks:
        spotify_id = track.get('spotify_id')
        
        if spotify_id:
            # Get complete details from Spotify
            spotify_details = get_spotify_track_details(spotify_id, access_token)
            
            if spotify_details:
                # Update track with Spotify details
                updated_track = {
                    **track,  # Original track data
                    'album': spotify_details['album'],  # Make sure album is included
                    'album_cover': spotify_details['album_cover'] or track.get('album_cover', ''),
                    'duration': spotify_details['duration'] or track.get('duration', 0),
                }
                updated_tracks.append(updated_track)
            else:
                updated_tracks.append(track)
        else:
            updated_tracks.append(track)
    
    return updated_tracks

# Example usage
if __name__ == "__main__":
    # Sample track data with Spotify IDs but missing album info
    sample_tracks = [
        {
            "position": 9,
            "id": "233",
            "spotify_id": "5ZLUm9eab8y3tqQ1OhQSHI",
            "name": "Abracadabra",
            "artist": "Lady Gaga",
            "album": "",
            "album_cover": "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png",
            "duration": 0,
            "listeners": 709493,
            "playcount": 12423024
        },
        {
            "position": 10,
            "id": "234",
            "spotify_id": "68qeaZhtMZ6abrJCYt6nQn",
            "name": "RATHER LIE (with The Weeknd)",
            "artist": "Playboi Carti",
            "album": "",
            "album_cover": "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png",
            "duration": 0,
            "listeners": 382342,
            "playcount": 3544925
        }
    ]
    
    # Replace with your actual Spotify API credentials
    CLIENT_ID = "your_spotify_client_id"
    CLIENT_SECRET = "your_spotify_client_secret"
    
    # Update tracks with complete Spotify details
    updated_tracks = update_tracks_with_spotify_details(sample_tracks, CLIENT_ID, CLIENT_SECRET)
    
    # Print results
    for track in updated_tracks:
        print(f"Track: {track['name']} by {track['artist']}")
        print(f"Album: {track['album']}")
        print(f"Spotify ID: {track['spotify_id']}")
        print("---")

print("Last.fm to Spotify matcher with album support loaded successfully!")