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
]
