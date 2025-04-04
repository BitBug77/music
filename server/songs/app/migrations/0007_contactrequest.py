# Generated by Django 5.1.6 on 2025-04-02 14:09

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0006_feedback'),
    ]

    operations = [
        migrations.CreateModel(
            name='ContactRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('email', models.EmailField(max_length=254)),
                ('subject', models.CharField(choices=[('recommendation', 'Music Recommendations'), ('social', 'Social Connections'), ('account', 'Account Issues'), ('technical', 'Technical Problems'), ('billing', 'Billing & Subscription'), ('other', 'Other')], max_length=20)),
                ('message', models.TextField()),
                ('attachment', models.FileField(blank=True, null=True, upload_to='contact_attachments/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
