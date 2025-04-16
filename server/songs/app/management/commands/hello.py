from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Just says hello'

    def handle(self, *args, **options):
        self.stdout.write('Hello, world!')