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
    path('playlists/', views.playlists, name='playlists'),
    path('playlists/<int:playlist_id>/', views.playlist_detail, name='playlist_detail'),
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
     path('user/music/', views.user_music, name='user-music'),
      path('preferences/', views.get_preferences, name='get_preferences'),
       path('spotifytrack/<str:spotify_track_id>/', views.get_spotify_track, name='get_spotify'),
     path('preferences/update/', views.trigger_preferences_update, name='update_preferences'),
    path('recommendations/personalized/', views.get_personalized_recommendations_view, name='personalized_recommendations'),
      path('history/recent/', views.get_recently_played, name='recently_played'),
    path('history/most-played/', views.get_most_played, name='most_played'),
    path('recommendations/songs/', views.get_song_recommendations, name='song-recommendations'),
    path('spotify/tracks/<str:track_id>/', views.fetch_and_store_spotify_track, name='fetch-spotify-track'),
    path('recommendations/', views.recommend_songs, name='backend_recommendations'),
    path('recommendations/for-you/', views.get_for_you_recommendations, name='for_you_recommendations'),
    path('recommend-friends/', views.recommend_friends, name='recommend_friends'),
    path('recommendations/friends/', views.recommend_songs_from_friends, name='recommend_songs_from_friends'),
   path('recommendations/<str:spotify_id>/', views.get_recommendations, name='get_recommendations'),
   path('notifications/', views.get_notifications, name='get_notifications'),
  path('notifications/<int:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),
   
    path('api/recommendations/for-you/', views.ForYouRecommendationsView.as_view(), name='for-you-recommendations'),
    path('api/recommendations/trending/',views.TrendingSongsView.as_view(), name='trending-songs'),
    path('api/recommendations/similar/', views.SimilarSongsView.as_view(), name='similar-songs'),
    path('api/recommendations/new-tracks/', views.NewTracksRecommendationView.as_view(), name='new-tracks'),
    path('api/recommendations/user-based/', views.UserBasedRecommendationView.as_view(), name='user-based-recommendations'),
    path('api/recommendations/matrix/', views.MatrixFactorizationRecommendationView.as_view(), name='matrix-factorization'),
    path('api/actions/log/', views.ActionLoggingView.as_view(), name='log-action'),
    path('api/recommendations/new-user/', views.NewUserRecommendationView.as_view(), name='new-user-recommendations'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)