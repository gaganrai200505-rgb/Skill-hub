"""
Keep-alive middleware for Render deployment.
Prevents Render from spinning down the server due to inactivity.
"""
import threading
import requests
import os
from django.utils.deprecation import MiddlewareMixin


class KeepAliveMiddleware(MiddlewareMixin):
    """
    Middleware to ping the server periodically to keep it alive on Render.
    This prevents the free tier from spinning down after 15 minutes of inactivity.
    """
    
    # Class variable to track if keep-alive thread is running
    _keep_alive_running = False
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
        
        # Start keep-alive thread only once per process
        if not KeepAliveMiddleware._keep_alive_running:
            KeepAliveMiddleware._keep_alive_running = True
            self._start_keep_alive()
    
    @staticmethod
    def _start_keep_alive():
        """Start a background thread to ping the server periodically."""
        # Only enable keep-alive in production (Render)
        if os.environ.get('RENDER') == 'true':
            def ping_server():
                import time
                backend_url = os.environ.get('RENDER_EXTERNAL_URL', 'http://localhost:8000')
                
                while True:
                    try:
                        # Ping the server health endpoint every 10 minutes
                        time.sleep(600)  # 10 minutes
                        requests.get(f'{backend_url}/api/health/', timeout=5)
                    except Exception:
                        # Silently fail - this is just a keep-alive
                        pass
            
            # Start daemon thread
            thread = threading.Thread(target=ping_server, daemon=True)
            thread.start()
    
    def __call__(self, request):
        response = self.get_response(request)
        return response
