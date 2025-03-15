from .models import Action
from rest_framework import serializers
from .models import Action, Song,Playlist, Recommendation, PlaylistSong, UserProfile, UserSimilarity

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

class PlaylistSerializer(serializers.ModelSerializer):
    song_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Playlist
        fields = ['id', 'title', 'song_count', 'created_at']
    
    def get_song_count(self, obj):
        return PlaylistSong.objects.filter(playlist=obj).count()


# Updated PlaylistSongSerializer
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


class SongSerializer(serializers.ModelSerializer):
    class Meta:
        model = Song
        fields = ['id', 'name', 'artist', 'album', 'duration', 'url']


class RecommendationSerializer(serializers.ModelSerializer):
    song_name = serializers.CharField(source='song.name')
    artist = serializers.CharField(source='song.artist')
    album = serializers.CharField(source='song.album')
    duration = serializers.IntegerField(source='song.duration', allow_null=True)
    url = serializers.URLField(source='song.url', allow_null=True)
    spotify_id = serializers.CharField(source='song.spotify_id', allow_null=True)
    recommendation_score = serializers.FloatField()
    
    class Meta:
        model = Recommendation
        fields = ['id', 'song_name', 'artist', 'album', 'duration', 'url', 'spotify_id', 'recommendation_score', 'timestamp']


class RecommendationSerializer(serializers.ModelSerializer):
    song = SongSerializer()
    reason = serializers.SerializerMethodField()
    
    class Meta:
        model = Recommendation
        fields = ['id', 'song', 'recommendation_score', 'reason']
        
    def get_reason(self, obj):
        reasons = []
        user = obj.user
        song = obj.song
        
        # Check if by favorite artist
        try:
            profile = UserProfile.objects.get(user=user)
            if song.artist in profile.preferences.get('favorite_artists', []):
                reasons.append(f"By {song.artist}, one of your favorite artists")
            
            # Check genre match
            user_genres = profile.preferences.get('favorite_genres', [])
            matching_genres = set(song.genres) & set(user_genres)
            if matching_genres:
                reasons.append(f"Matches your preferred genres: {', '.join(matching_genres)}")
        except UserProfile.DoesNotExist:
            pass
            
        # Check similar users
        similar_users = UserSimilarity.objects.filter(
            user1=user, 
            similarity_score__gt=0.5
        ).values_list('user2', flat=True)
        
        similar_likes = Action.objects.filter(
            user_id__in=similar_users,
            song=song,
            action_type='like'
        ).count()
        
        if similar_likes > 0:
            reasons.append(f"Liked by {similar_likes} users with similar taste")
            
        # Return primary reason or default
        if reasons:
            return reasons[0]
        return "Based on your listening history"