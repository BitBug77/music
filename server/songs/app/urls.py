from django.urls import path
from . import views


app_name = 'app'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('spotify-login/', views.spotify_login, name='spotify_login'),
    path('spotify-callback/', views.spotify_callback, name='spotify_callback'),
    path('home/', views.home, name='home'),
    path('popularity/', views.get_songs_by_popularity, name='songs_by_popularity'),
    path("csrf/", views.csrf_token, name="csrf"),
    
]