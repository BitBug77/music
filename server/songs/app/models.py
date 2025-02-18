from django.db import models

# Create your models here.
from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    spotify_token = models.CharField(max_length=300, null=True, blank=True)
    refresh_token = models.CharField(max_length=300, null=True, blank=True)
    spotify_id = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return self.user.username