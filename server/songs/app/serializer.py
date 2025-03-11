from .models import Action
from rest_framework import serializers
from .models import Action, Song,PlaylistSong, Playlist
class SavedSongSerializer(serializers.ModelSerializer):
    song_name = serializers.CharField(source='song.name')
    artist = serializers.CharField(source='song.artist')
    album = serializers.CharField(source='song.album')
    duration = serializers.IntegerField(source='song.duration', allow_null=True)
    url = serializers.URLField(source='song.url', allow_null=True)
    action_type = serializers.CharField(default="save", read_only=True)  # Ensuring only 'save' action

    class Meta:
        model = Action
        fields = ['id', 'song_name', 'artist', 'album', 'duration', 'url', 'timestamp', 'action_type']


class LikedSongSerializer(serializers.ModelSerializer):
    song_name = serializers.CharField(source='song.name')
    artist = serializers.CharField(source='song.artist')
    album = serializers.CharField(source='song.album')
    duration = serializers.IntegerField(source='song.duration', allow_null=True)
    url = serializers.URLField(source='song.url', allow_null=True)
    action_type = serializers.CharField(default="like", read_only=True)  # Ensuring it's a like action

    class Meta:
        model = Action
        fields = ['id', 'song_name', 'artist', 'album', 'duration', 'url', 'timestamp', 'action_type']

# Add this to your serializers.py
class PlaylistSerializer(serializers.ModelSerializer):
    song_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Playlist
        fields = ['id', 'title', 'song_count', 'created_at']
    
    def get_song_count(self, obj):
        return PlaylistSong.objects.filter(playlist=obj).count()

class PlaylistSongSerializer(serializers.ModelSerializer):
    song_name = serializers.CharField(source='song.name')
    artist = serializers.CharField(source='song.artist')
    album = serializers.CharField(source='song.album')
    duration = serializers.IntegerField(source='song.duration', allow_null=True)
    url = serializers.URLField(source='song.url', allow_null=True)
    spotify_id = serializers.CharField(source='song.spotify_id')
    
    class Meta:
        model = PlaylistSong
        fields = ['id', 'song_name', 'artist', 'album', 'duration', 'url', 'spotify_id', 'added_at']