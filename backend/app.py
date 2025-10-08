from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress
import requests
import json
import os
import logging
from logging.handlers import RotatingFileHandler
import time

# Initialize Flask app
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

# Security configurations
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')

# Initialize extensions
CORS(app, origins=os.environ.get('ALLOWED_ORIGINS', '*').split(','))
Compress(app)

# Rate limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

# Configure logging
if not app.debug:
    file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('SRHR Chatbot startup')

# Configuration
OLLAMA_URL = os.environ.get('OLLAMA_URL', "https://ollama-production-e9dd.up.railway.app/api/generate")
REQUEST_TIMEOUT = int(os.environ.get('REQUEST_TIMEOUT', '120'))
MAX_RESPONSE_LENGTH = int(os.environ.get('MAX_RESPONSE_LENGTH', '5000'))

SYSTEM_PROMPT = """
You are an SRHR (Sexual and Reproductive Health and Rights) specialist in Liberia. 
Always explain things in the simplest English, the way an ordinary Liberian with little schooling can understand. 
Avoid big medical words. Use short sentences, easy examples, and everyday language. 
Be respectful and caring, like a trusted health worker speaking to a community member. 
Make sure your answers are culturally sensitive for Liberia.
If the question is about health risks, also give clear advice on what action the person should take.
"""

class OllamaServiceError(Exception):
    """Custom exception for Ollama service errors"""
    pass

def validate_prompt(prompt):
    """Validate and sanitize user prompt"""
    if not prompt or not isinstance(prompt, str):
        return False, "Prompt must be a non-empty string"
    
    if len(prompt.strip()) == 0:
        return False, "Prompt cannot be empty"
    
    if len(prompt) > 1000:
        return False, "Prompt too long (max 1000 characters)"
    
    # Basic content validation
    forbidden_patterns = ['<script>', 'javascript:', 'onload=']
    for pattern in forbidden_patterns:
        if pattern in prompt.lower():
            return False, "Invalid content in prompt"
    
    return True, prompt.strip()

def make_ollama_request(prompt):
    """Make request to Ollama API with error handling"""
    start_time = time.time()
    
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": "gemma3n:latest",
                "prompt": prompt,
                "stream": True
            },
            stream=True,
            timeout=REQUEST_TIMEOUT
        )
        
        response.raise_for_status()
        
        complete_response = ""
        for line in response.iter_lines():
            if line:
                try:
                    json_response = json.loads(line.decode("utf-8"))
                    if "response" in json_response:
                        complete_response += json_response["response"]
                        
                        # Prevent excessively long responses
                        if len(complete_response) > MAX_RESPONSE_LENGTH:
                            app.logger.warning("Response exceeded maximum length")
                            complete_response = complete_response[:MAX_RESPONSE_LENGTH] + "... [response truncated]"
                            break
                            
                except json.JSONDecodeError as e:
                    app.logger.error(f"JSON decode error: {e}")
                    continue
        
        processing_time = time.time() - start_time
        app.logger.info(f"Ollama request completed in {processing_time:.2f}s")
        
        return complete_response.strip()
        
    except requests.exceptions.Timeout:
        app.logger.error("Ollama request timeout")
        raise OllamaServiceError("Request timeout - please try again")
    except requests.exceptions.ConnectionError:
        app.logger.error("Ollama connection error")
        raise OllamaServiceError("Cannot connect to AI service")
    except requests.exceptions.HTTPError as e:
        app.logger.error(f"Ollama HTTP error: {e}")
        raise OllamaServiceError("AI service error")
    except Exception as e:
        app.logger.error(f"Unexpected error: {e}")
        raise OllamaServiceError("Internal server error")

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        "status": "healthy",
        "timestamp": time.time(),
        "service": "srhr-chatbot"
    })

@app.route("/chatbot", methods=["POST"])
@limiter.limit("10 per minute")
def chatbot():
    """Main chatbot endpoint"""
    # Validate content type
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400
    
    data = request.get_json()
    
    # Validate request data
    if not data or 'prompt' not in data:
        return jsonify({"error": "Missing 'prompt' in request body"}), 400
    
    user_prompt = data.get("prompt", "")
    
    # Validate prompt
    is_valid, validation_result = validate_prompt(user_prompt)
    if not is_valid:
        return jsonify({"error": validation_result}), 400
    
    # Construct final prompt
    final_prompt = f"{SYSTEM_PROMPT}\n\nUser: {user_prompt}\nSRHR Specialist:"
    
    try:
        # Get response from Ollama
        bot_response = make_ollama_request(final_prompt)
        
        # Log successful interaction (without sensitive data)
        app.logger.info(f"Chatbot response generated for user query")
        
        return jsonify({
            "response": bot_response,
            "timestamp": time.time()
        })
        
    except OllamaServiceError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        app.logger.error(f"Unexpected error in chatbot endpoint: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(429)
def ratelimit_handler(e):
    """Handle rate limit exceeded"""
    return jsonify({
        "error": "Rate limit exceeded",
        "message": "Too many requests. Please try again later."
    }), 429

@app.errorhandler(404)
def not_found_handler(e):
    """Handle 404 errors"""
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error_handler(e):
    """Handle 500 errors"""
    app.logger.error(f"Internal server error: {e}")
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    debug_mode = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    # For production, use a production WSGI server
    if debug_mode:
        app.run(host='0.0.0.0', port=port, debug=True)
    else:
        # This will be overridden by Gunicorn in production
        app.run(host='0.0.0.0', port=port, debug=False)