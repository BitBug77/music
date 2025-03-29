# run_kafka.py
import os
import django

# Set up Django environment FIRST
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'songs.settings')  # Assuming 'songs.settings' is your settings module
django.setup()

# AFTER Django is set up, import your consumer
from app.kafka_consumer import consume_messages  # Adjust this import path as needed

if __name__ == "__main__":
    print("Starting Kafka consumer...")
    try:
        consume_messages()
    except KeyboardInterrupt:
        print("Kafka consumer stopped")