# kafka_consumer.py
from confluent_kafka import Consumer, KafkaException, KafkaError
import json
import django
import os
from django.conf import settings

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "songs.settings")
django.setup()

from app.models import User, Notification

# Initialize Kafka consumer
consumer = Consumer({
    'bootstrap.servers': settings.KAFKA_BROKER_URL,
    'group.id': 'friend_request_group',
    'auto.offset.reset': 'earliest'
})

consumer.subscribe([settings.KAFKA_TOPIC])

def create_notification(event_type, sender_id, receiver_id, sender_username):
    """Create a notification based on the event type"""
    try:
        sender = User.objects.get(id=sender_id)
        recipient = User.objects.get(id=receiver_id)
        
        if event_type == 'friend_request_sent':
            message = f"{sender_username} sent you a friend request"
            notification_type = 'friend_request'
        elif event_type == 'friend_request_accepted':
            message = f"{sender_username} accepted your friend request"
            notification_type = 'request_accepted'
        elif event_type == 'friend_request_rejected':
            message = f"{sender_username} declined your friend request"
            notification_type = 'request_rejected'
        else:
            return
        
        # Create notification
        Notification.objects.create(
            recipient=recipient,
            sender=sender,
            notification_type=notification_type,
            message=message
        )
        print(f"Notification created for {recipient.username}: {message}")
        
    except User.DoesNotExist:
        print(f"User not found: sender_id={sender_id} or receiver_id={receiver_id}")
    except Exception as e:
        print(f"Error creating notification: {str(e)}")

def consume_messages():
    """Consume messages from Kafka and create notifications."""
    try:
        while True:
            msg = consumer.poll(timeout=1.0)
            
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    print(f"End of partition reached: {msg.topic()} [{msg.partition()}] @ {msg.offset()}")
                else:
                    raise KafkaException(msg.error())
            else:
                # Process the message
                message_value = json.loads(msg.value().decode('utf-8'))
                print(f"Consumed message: {message_value}")
                
                # Create notification based on event type
                event_type = message_value.get('event')
                sender_id = message_value.get('sender_id')
                receiver_id = message_value.get('receiver_id')
                sender_username = message_value.get('sender_username')
                
                # For friend requests, notify the receiver
                if event_type == 'friend_request_sent':
                    create_notification(event_type, sender_id, receiver_id, sender_username)
                
                # For accepted/rejected requests, notify the original sender
                elif event_type in ['friend_request_accepted', 'friend_request_rejected']:
                    create_notification(event_type, receiver_id, sender_id, message_value.get('receiver_username'))
                
    finally:
        consumer.close()

# To start consuming messages
if __name__ == "__main__":
    consume_messages()