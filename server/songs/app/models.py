from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
class UserProfile(models.Model):
    # Basic connection to auth user
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # Basic profile information
    name = models.CharField(max_length=100, blank=True, null=True)
    pronoun = models.CharField(max_length=50, blank=True, null=True)
    gender = models.CharField(max_length=50, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pictures', blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)

    # Spotify user identifier (without tokens)
    spotify_id = models.CharField(max_length=100, blank=True, null=True)

    # Preferences (e.g., favorite artists)
    preferences = models.JSONField(default=dict, blank=True)  # Store user preferences

    # Join date
    joined_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username

# Signal to create a UserProfile when a User is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

# Signal to save UserProfile when User is saved
@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    try:
        instance.profile.save()
    except UserProfile.DoesNotExist:
        UserProfile.objects.create(user=instance)
    

# Song Model
class Song(models.Model):
    spotify_id = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    album = models.CharField(max_length=255)
    duration = models.IntegerField(null=True, blank=True)
    genre = models.CharField(max_length=255, null=True, blank=True)
    url = models.URLField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.name} by {self.artist}"


# Action Model
class Action(models.Model):
    ACTION_CHOICES = [
        ('like', 'Like'),
        ('save', 'Save'),
        ('play', 'Play'),
        ('skip', 'Skip'),
        ('view', 'View'),  # Track song views
        ('share', 'Share'),  # Track song shares
        ('complete', 'Complete'),  # Track complete listens
        ('search', 'Search'),  # Track search actions
    ]
    
    # Main foreign keys
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name='song_actions', blank=True, null=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Action metadata
    action_type = models.CharField(choices=ACTION_CHOICES, max_length=10)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Search-specific fields
    search_query = models.CharField(max_length=255, blank=True, null=True)  # What the user searched for
    search_type = models.CharField(max_length=20, blank=True, null=True)  # 'song', 'artist', 'album', 'general'
    
    # Context and engagement metrics
    context = models.CharField(max_length=50, blank=True, null=True)  # e.g., 'recommended', 'search', 'playlist'
    duration = models.PositiveIntegerField(blank=True, null=True)  # Time spent (for plays, views)
    
    class Meta:
        # Remove unique_together constraint for search actions (since they may not have a song)
        constraints = [
            # Only enforce uniqueness when it's not a search action
            models.UniqueConstraint(
                fields=['user', 'song', 'action_type'],
                condition=~models.Q(action_type='search'),
                name='unique_non_search_action'
            )
        ]
        indexes = [
            models.Index(fields=['user', 'song', 'action_type']),
            models.Index(fields=['user', 'action_type']),
            models.Index(fields=['song', 'action_type']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['search_query']),  # For analyzing popular searches
            models.Index(fields=['search_type']),   # For analyzing search patterns
        ]

# Add this to your models.py
class Playlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} by {self.user.username}"
    
    class Meta:
        indexes = [
            models.Index(fields=['user']),
        ]
class PlaylistSong(models.Model):
    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE, related_name='playlist_songs')
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name='playlists')
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('playlist', 'song')
        ordering = ['-added_at']
    
    def __str__(self):
        return f"{self.song.name} in {self.playlist.title}"

# Recommendation Model
class Recommendation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    song = models.ForeignKey(Song, on_delete=models.CASCADE)
    recommendation_score = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Recommended {self.song.name} to {self.user.username}"


# User Similarity Model
class UserSimilarity(models.Model):
    user1 = models.ForeignKey(User, related_name='similarities_user1', on_delete=models.CASCADE)
    user2 = models.ForeignKey(User, related_name='similarities_user2', on_delete=models.CASCADE)
    similarity_score = models.FloatField()

    def __str__(self):
        return f"Similarity between {self.user1.username} and {self.user2.username}"


# Friend Request Model
class FriendRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    ]

    sender = models.ForeignKey(User, related_name="sent_requests", on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name="received_requests", on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.status})"


# Esewa Payment Model
class EsewaPayment(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reference_id = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.reference_id} - {self.status}"
    



class UserMusic(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='music')
    spotify_track_id = models.CharField(max_length=100)
    track_name = models.CharField(max_length=255)
    artist_name = models.CharField(max_length=255)
    album_name = models.CharField(max_length=255, blank=True, null=True)
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'spotify_track_id')
        ordering = ['-added_at']
    
    def __str__(self):
        return f"{self.track_name} by {self.artist_name} ({self.user.username})"