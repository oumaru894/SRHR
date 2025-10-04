# /backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)

# Ollama server endpoint
OLLAMA_URL = "https://ollama-production-e9dd.up.railway.app/api/generate"

# SRHR System prompt
SYSTEM_PROMPT = """
You are an SRHR (Sexual and Reproductive Health and Rights) specialist in Liberia. 
Always explain things in the simplest English, the way an ordinary Liberian with little schooling can understand. 
Avoid big medical words. Use short sentences, easy examples, and everyday language. 
Be respectful and caring, like a trusted health worker speaking to a community member. 
Make sure your answers are culturally sensitive for Liberia.
If the question is about health risks, also give clear advice on what action the person should take.
"""

@app.route("/chatbot", methods=["POST"])
def chatbot():
    data = request.get_json()
    user_prompt = data.get("prompt", "")

    final_prompt = f"{SYSTEM_PROMPT}\n\nUser: {user_prompt}\nSRHR Specialist:"

    try:
        # Send request to Ollama server
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": "phi",
                "prompt": final_prompt,
                "stream": True  # streaming enabled if supported
            },
            stream=True,
            timeout=120  # Adjust timeout for long responses
        )

        complete_response = ""
        for line in response.iter_lines():
            if line:
                try:
                    json_response = json.loads(line.decode("utf-8"))
                    if "response" in json_response:
                        complete_response += json_response["response"]
                except json.JSONDecodeError:
                    continue

        return jsonify({"response": complete_response.strip()})

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to connect to Ollama server: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
