const API_URL = process.env.API
const Chatbot_URL = API_URL ? `${API_URL}/chatbot` : 'http://localhost:5000/chatbot'








export {
    API_URL,
    Chatbot_URL,
}