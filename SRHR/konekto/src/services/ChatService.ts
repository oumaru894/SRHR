// src/services/ChatService.ts
import { networkService } from './NetworkService';
import { offlineModelService } from './OfflineModelService';

export type ChatResponse = {
  text: string;
  source: 'online' | 'offline' | 'fallback';
  confidence?: number;
  category?: string;
  similarQuestions?: string[];
};

class ChatService {
  private onlineEndpoint = 'http://127.0.0.1:5000/chatbot'; // Your Flask backend

  async sendMessage(userMessage: string): Promise<ChatResponse> {
    const isOnline = await networkService.checkConnection();
    
    // Try online first if available
    if (isOnline) {
      try {
        const onlineResponse = await this.tryOnline(userMessage);
        if (onlineResponse) {
          return onlineResponse;
        }
      } catch (error) {
        console.log('Online service failed, falling back to offline:', error);
      }
    }

    // Use offline model
    return this.tryOffline(userMessage);
  }

  private async tryOnline(userMessage: string): Promise<ChatResponse | null> {
    try {
      const response = await fetch(this.onlineEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage }),
        timeout: 10000 // 10 second timeout
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      
      return {
        text: data.response || "I couldn't process your request at the moment.",
        source: 'online',
        confidence: 0.9, // Assume high confidence for online responses
        category: data.category
      };
    } catch (error) {
      console.error('Online chat error:', error);
      return null;
    }
  }

  private async tryOffline(userMessage: string): Promise<ChatResponse> {
    // Check if this is a question we can handle offline
    if (!offlineModelService.canHandleOffline(userMessage)) {
      return {
        text: "I'm currently offline and don't have information about that topic. Please check your internet connection or try asking about sexual and reproductive health in Liberia.",
        source: 'fallback',
        confidence: 0.1
      };
    }

    try {
      const offlineResponse = await offlineModelService.generateResponse(userMessage);
      
      return {
        text: offlineResponse.answer,
        source: 'offline',
        confidence: offlineResponse.confidence,
        category: offlineResponse.category,
        similarQuestions: offlineResponse.similarQuestions
      };
    } catch (error) {
      console.error('Offline model error:', error);
      
      return {
        text: "I'm having trouble processing your request offline. Please check your internet connection or try rephrasing your question about sexual and reproductive health.",
        source: 'fallback',
        confidence: 0.1
      };
    }
  }
}

export const chatService = new ChatService();