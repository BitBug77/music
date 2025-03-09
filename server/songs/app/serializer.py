from .models import Action
from rest_framework import serializers
from .models import Action, Song
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
