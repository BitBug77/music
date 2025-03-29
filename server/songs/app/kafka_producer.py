# kafka_producer.py

from confluent_kafka import Producer
import json
from django.conf import settings

# Initialize Kafka producer
producer = Producer({'bootstrap.servers': settings.KAFKA_BROKER_URL})

def send_kafka_message(topic, message):
    """Function to send messages to Kafka."""
    
    # Define a callback function for delivery reports
    def delivery_report(err, msg):
        if err is not None:
            print(f"Message delivery failed: {err}")
        else:
            print(f"Message delivered to {msg.topic()} [{msg.partition()}]")

    # Convert message to JSON and send to Kafka
    producer.produce(topic, value=json.dumps(message), callback=delivery_report)
    producer.flush()  # Ensure message is delivered
