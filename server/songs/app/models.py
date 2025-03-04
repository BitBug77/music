from django.db import models

# Create your models here.
from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    spotify_token = models.CharField(max_length=300, null=True, blank=True)
    refresh_token = models.CharField(max_length=300, null=True, blank=True)
    spotify_id = models.CharField(max_length=100, null=True, blank=True)
    preferences = models.JSONField(default=dict)  # Store user preferences as a JSON field
    history = models.JSONField(default=list)  # Store history of interacted songs as a list of song ids

    def __str__(self):
        return self.user.username
    

from django.db import models
from django.contrib.auth.models import User

# Song Model
class Song(models.Model):
    spotify_id = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    album = models.CharField(max_length=255)
    duration = models.IntegerField(null=True, blank=True)  # Duration in seconds
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
    ]
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name='actions')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    spotify_id = models.CharField(max_length=255, default="unkown")
    action_type = models.CharField(choices=ACTION_CHOICES, max_length=10)
    timestamp = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ('user', 'song', 'action_type')  # Prevent duplicates
        indexes = [
            models.Index(fields=['user', 'song', 'action_type']),  # Index for faster queries on these fields
        ]

# Recommendation Model
class Recommendation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    song = models.ForeignKey(Song, on_delete=models.CASCADE)
    recommendation_score = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Recommended {self.song.name} to {self.user.username}"

class UserSimilarity(models.Model):
    user1 = models.ForeignKey(User, related_name='similarities_user1', on_delete=models.CASCADE)
    user2 = models.ForeignKey(User, related_name='similarities_user2', on_delete=models.CASCADE)
    similarity_score = models.FloatField()

    def __str__(self):
        return f"Similarity between {self.user1.username} and {self.user2.username}"


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

