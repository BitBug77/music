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
class RecommendationSerializers(serializers.ModelSerializer):
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