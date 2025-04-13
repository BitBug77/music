from .models import Action
from rest_framework import serializers
from .models import Action, Song,Playlist, Recommendation, PlaylistSong, UserProfile, UserSimilarity

class SavedSongSerializer(serializers.ModelSerializer):
    song_name = serializers.CharField(source='song.name')
    artist = serializers.CharField(source='song.artist')
    album = serializers.CharField(source='song.album')
    duration = serializers.IntegerField(source='song.duration', allow_null=True)
    url = serializers.URLField(source='song.url', allow_null=True)
    spotify_id = serializers.CharField(source='song.spotify_id', allow_null=True)  # Added spotify_id
    album_cover = serializers.URLField(source='song.album_cover', allow_null=True)  
    genre = serializers.CharField(source='song.genre', allow_null=True)  # Added genre
    action_type = serializers.CharField(default="save", read_only=True)

    class Meta:
        model = Action
        fields = ['id', 'song_name', 'artist', 'album', 'duration', 'url', 'spotify_id', 'album_cover', 'genre', 'timestamp', 'action_type']



class LikedSongSerializer(serializers.ModelSerializer):
    song_name = serializers.CharField(source='song.name')
    artist = serializers.CharField(source='song.artist')
    album = serializers.CharField(source='song.album')
    duration = serializers.IntegerField(source='song.duration', allow_null=True)
    url = serializers.URLField(source='song.url', allow_null=True)
    spotify_id = serializers.CharField(source='song.spotify_id', allow_null=True)  # Added spotify_id
    album_cover = serializers.URLField(source='song.album_cover', allow_null=True)  
    genre = serializers.CharField(source='song.genre', allow_null=True)  # Added genre
    action_type = serializers.CharField(default="like", read_only=True)

    class Meta:
        model = Action
        fields = ['id', 'song_name', 'artist', 'album', 'duration', 'url', 'spotify_id', 'album_cover', 'genre', 'timestamp', 'action_type']





class PlaylistSerializer(serializers.ModelSerializer):
    song_count = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()  # Add this line
    
    class Meta:
        model = Playlist
        fields = ['id', 'title', 'song_count', 'created_at', 'thumbnail']  # Added thumbnail
    
    def get_song_count(self, obj):
        return PlaylistSong.objects.filter(playlist=obj).count()
    
    def get_thumbnail(self, obj):
        # Get the first song's album cover as the playlist thumbnail
        first_song = PlaylistSong.objects.filter(playlist=obj).select_related('song').first()
        if first_song and first_song.song.album_cover:
            return first_song.song.album_cover
        return None  # Return None if playlist is empty or songs don't have album covers


class SongSerializer(serializers.ModelSerializer):
    class Meta:
        model = Song
        fields = ['id', 'name', 'artist', 'album', 'duration', 'url', 'spotify_id', 'album_cover', 'genre']  # Added genre


class PlaylistSongSerializer(serializers.ModelSerializer):
    song_name = serializers.CharField(source='song.name')
    artist = serializers.CharField(source='song.artist')
    album = serializers.CharField(source='song.album')
    duration = serializers.IntegerField(source='song.duration', allow_null=True)
    url = serializers.URLField(source='song.url', allow_null=True)
    spotify_id = serializers.CharField(source='song.spotify_id')
    album_cover = serializers.URLField(source='song.album_cover', allow_null=True)  
    genre = serializers.CharField(source='song.genre', allow_null=True)  # Added genre
    
    class Meta:
        model = PlaylistSong
        fields = ['id', 'song_name', 'artist', 'album', 'duration', 'url', 'spotify_id', 'album_cover', 'genre', 'added_at']  # Included genre

class RecommendationSerializer(serializers.ModelSerializer):
    song_name = serializers.CharField(source='song.name')
    artist = serializers.CharField(source='song.artist')
    album = serializers.CharField(source='song.album')
    duration = serializers.IntegerField(source='song.duration', allow_null=True)
    url = serializers.URLField(source='song.url', allow_null=True)
    spotify_id = serializers.CharField(source='song.spotify_id', allow_null=True)
    album_cover = serializers.URLField(source='song.album_cover', allow_null=True)  
    genre = serializers.CharField(source='song.genre', allow_null=True)  # Added genre
    recommendation_score = serializers.FloatField()
    
    class Meta:
        model = Recommendation
        fields = ['id', 'song_name', 'artist', 'album', 'duration', 'url', 'spotify_id', 'album_cover', 'genre', 'recommendation_score', 'timestamp']  # Included genre
 # Added album_cover
class RecommendationSerializer(serializers.ModelSerializer):
    song_name = serializers.CharField(source='song.name')
    artist = serializers.CharField(source='song.artist')
    album = serializers.CharField(source='song.album')
    duration = serializers.IntegerField(source='song.duration', allow_null=True)
    url = serializers.URLField(source='song.url', allow_null=True)
    spotify_id = serializers.CharField(source='song.spotify_id', allow_null=True)
    album_cover = serializers.URLField(source='song.album_cover', allow_null=True)  # Added album_cover
    genre = serializers.CharField(source='song.genre', allow_null=True)  # Added genre
    recommendation_score = serializers.FloatField()
    
    class Meta:
        model = Recommendation
        fields = ['id', 'song_name', 'artist', 'album', 'duration', 'url', 'spotify_id', 'album_cover', 'genre', 'recommendation_score', 'timestamp']  # Included album_cover and genre
        
        
        
from .models import Feedback

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['id', 'feedbackType', 'rating', 'feedbackText', 'contactConsent', 'created_at']
        read_only_fields = ['id', 'created_at']
        

from .models import ContactRequest

class ContactRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactRequest
        fields = ['id', 'name', 'email', 'subject', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']