from django.urls import path
from . import views
from .views import GetSongView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
) 

from django.conf import settings
from django.conf.urls.static import static

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
    path('recommend-friends/', views.recommend_friends, name='recommend_friends'),
    path('send-friend-request/', views.send_friend_request, name='send_friend_request'),
    path('respond-friend-request/', views.respond_to_friend_request, name='respond_friend_request'),
    path('search_user/<str:username>/', views.search_user, name='search_user'),
    path("esewa/initiate/", views.initiate_payment, name="esewa-initiate"),
    path("esewa/success/", views.payment_success, name="esewa-success"),
    path("esewa/failure/", views.payment_failure, name="esewa-failure"),
    path('songs/<str:spotify_track_id>/like/', views.like_song, name='like_song'),
    path('songs/<str:spotify_track_id>/save/', views.save_song, name='save_song'),
    path('songs/<str:spotify_track_id>/play/', views.play_song, name='play_song'),
    path('songs/<str:spotify_track_id>/skip/', views.skip_song, name='skip_song'),
    path('songs/<str:spotify_track_id>/view/', views.view_song, name='view_song'),
    path('songs/<str:spotify_track_id>/share/', views.share_song, name='share_song'),
    path('songs/<str:spotify_track_id>/complete/', views.complete_song, name='complete_song'),
    path('search/track/', views.track_search, name='track_search'),
    path('playlists/', views.user_playlists, name='user_playlists'),
    path('playlists/<int:playlist_id>/songs/', views.playlist_songs, name='playlist_songs'),
    path('song/<str:id>/', GetSongView.as_view(), name='get_song'),
    path('session/', views.session, name='get_session'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('spotify-token/', views.get_spotify_token, name='get_spotify_token'),
    path('liked-songs/', views.get_liked_songs, name='liked-playlist'),
    path('friends/', views.list_friends, name='list_friends'),
    path('friend-requests/', views.get_friend_requests, name='get_friend_requests'),
     path('profile/', views.update_profile, name='update_profile'),
     path('profile-picture/', views.update_profile_picture, name='update_profile_picture'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)