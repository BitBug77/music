from django.db import models
from .models import Action
# Create your models here.
from django.db import models
from django.contrib.auth.models import User
from rest_framework import serializers

class SavedSongSerializer(serializers.ModelSerializer):
    song_name = serializers.CharField(source='song.name')
    artist = serializers.CharField(source='song.artist')
    album = serializers.CharField(source='song.album')
    duration = serializers.IntegerField(source='song.duration')
    url = serializers.URLField(source='song.url')

    class Meta:
        model = Action
        fields = ['id', 'song_name', 'artist', 'album', 'duration', 'url', 'timestamp']