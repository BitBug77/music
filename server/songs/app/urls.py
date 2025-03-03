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
    path('recommend/', views.recommended_songs, name='recommend_songs'),
    path('logout/', views.logout_view, name='logout'),
    path('search-songs/', views.search_songs, name='search_songs'),
    path('recommend-friends/', views.recommend_friends, name='recommend_friends'),
    path('send-friend-request/<int:user_id>/', views.send_friend_request, name='send_friend_request'),
    path('respond-friend-request/<int:request_id>/<str:response>/', views.respond_to_friend_request, name='respond_friend_request'),
    path('search_user/<str:username>/', views.search_user, name='search_user'),
    path("esewa/initiate/", views.initiate_payment, name="esewa-initiate"),
    path("esewa/success/", views.payment_success, name="esewa-success"),
    path("esewa/failure/", views.payment_failure, name="esewa-failure"),
    path('song/<int:song_id>/like/', views.like_song, name='like_song'),
    path('song/<int:song_id>/save/', views.save_song, name='save_song'),
    path('song/<int:song_id>/play/', views.play_song, name='play_song'),
    path('song/<int:song_id>/skip/', views.skip_song, name='skip_song'),
    path('song/<str:track_id>/', views.fetch_song_data, name='fetch_song_data'),
]
