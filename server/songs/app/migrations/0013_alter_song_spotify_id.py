# Generated by Django 5.1.5 on 2025-04-16 16:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0012_chartentry'),
    ]

    operations = [
        migrations.AlterField(
            model_name='song',
            name='spotify_id',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
    ]
