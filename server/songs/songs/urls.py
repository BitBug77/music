from django.contrib import admin
from django.urls import path, include
import os
from django.http import JsonResponse
def home_view(request):
    """Simple home view for API status"""
    return JsonResponse({
        'message': 'Music API is running successfully!',
        'status': 'online',
        'version': '1.0',
        'endpoints': {
            'admin': '/admin/',
            'api_docs': 'Add your API endpoints here'
        }
    })

def health_check(request):
    """Health check endpoint for monitoring"""
    return JsonResponse({
        'status': 'healthy',
        'service': 'music-api'
    })

urlpatterns = [
    path('', home_view, name='home'),  # This handles the root path
    path('health/', health_check, name='health'),  # Optional health check
    # Add your other API endpoints here
    # path('songs/', views.songs_list, name='songs_list'),
    # path('playlists/', views.playlists_list, name='playlists_list'),
    # etc.

    path('admin/', admin.site.urls),
    path('', include('app.urls')),  # Include app URLs here
]