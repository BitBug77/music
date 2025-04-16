from django.core.management.base import BaseCommand
from django.utils import timezone
from app .models import ChartEntry, Song
from app .lastfm_utils import get_top_tracks, format_track_data

class Command(BaseCommand):
    help = 'Updates weekly and monthly charts from Last.fm'

    def handle(self, *args, **options):
        self.stdout.write('Updating charts...')
        
        # Update weekly charts
        self._update_chart('weekly', '7day')
        
        # Update monthly charts
        self._update_chart('monthly', '1month')
        
        self.stdout.write(self.style.SUCCESS('Charts updated successfully!'))
    
    def _update_chart(self, period, lastfm_period):
        tracks = get_top_tracks(period=lastfm_period, limit=50)
        if not tracks:
            self.stdout.write(self.style.ERROR(f'Failed to fetch {period} chart data'))
            return
        
        # Clear existing recent chart entries for this period
        ChartEntry.objects.filter(period=period).delete()
        
        # Process and store chart data
        for position, track in enumerate(tracks, 1):
            track_data = format_track_data(track)
            
            song = Song.objects.filter(name=track_data['name'], artist=track_data['artist']).first()
            if not song:
                song = Song.objects.create(
                    name=track_data['name'],
                    artist=track_data['artist'],
                    album=track_data['album'],
                    album_cover=track_data['album_cover'],
                    genre=track_data['genre'],
                    duration=track_data['duration'],
                    url=track_data['url']
                )
            
            ChartEntry.objects.create(
                song=song,
                position=position,
                period=period,
                listeners=track_data['listeners'],
                playcount=track_data['playcount']
            )