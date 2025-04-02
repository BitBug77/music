# middleware.py
import logging
import json
from django.utils.deprecation import MiddlewareMixin

class RequestResponseLoggingMiddleware(MiddlewareMixin):
    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger(__name__)
        
    def process_request(self, request):
        self.logger.info(f"REQUEST: {request.method} {request.path} {dict(request.GET)}")
        return None
        
    def process_response(self, request, response):
        self.logger.info(f"RESPONSE: {request.path} {response.status_code}")
        if hasattr(response, 'content'):
            try:
                content = json.loads(response.content)
                if 'error' in content:
                    self.logger.error(f"Error in response: {content['error']}")
            except:
                pass
        return response