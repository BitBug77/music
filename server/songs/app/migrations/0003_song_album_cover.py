# Generated by Django 5.1.5 on 2025-03-16 01:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0002_alter_playlistsong_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='song',
            name='album_cover',
            field=models.URLField(blank=True, null=True),
        ),
    ]
