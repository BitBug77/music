# Generated by Django 5.1.5 on 2025-03-03 15:45

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0003_remove_action_song_action_spotify_id'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='action',
            name='spotify_id',
        ),
        migrations.AddField(
            model_name='action',
            name='song',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to='app.song'),
            preserve_default=False,
        ),
    ]
