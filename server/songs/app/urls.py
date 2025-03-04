from django.urls import path
from . import views
from .views import GetSongView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
) 

app_name = 'app'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('spotify-login/', views.spotify_login, name='spotify_login'),
    path('spotify-callback/', views.spotify_callback, name='spotify_callback'),
    path('home/', views.home, name='home'),
    path('popularity/', views.get_songs_by_popularity, name='songs_by_popularity'),
    path('recommend/', views.recommended_songs, name='recommend_songs'),
    path('logout/', views.logout_view, name='logout'),
    path('search-songs/', views.search_songs, name='search_songs'),
    path('song/<str:id>/', GetSongView.as_view(), name='get_song'),
    path('log-interaction/', views.log_interaction, name='log-interaction'),
    path('session/', views.session, name='get_session'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('spotify-token/', views.get_spotify_token, name='get_spotify_token'),
]