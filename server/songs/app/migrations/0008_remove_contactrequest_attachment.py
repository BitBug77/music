# Generated by Django 5.1.6 on 2025-04-02 14:30

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0007_contactrequest'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='contactrequest',
            name='attachment',
        ),
    ]
