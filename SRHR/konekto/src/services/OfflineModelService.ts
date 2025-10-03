// src/services/OfflineModelService.ts
import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import * as mobilenet from '@tensorflow/tfjs-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import your trained model assets (you'll need to convert the PyTorch model to TensorFlow.js)
// For now, we'll create a mock implementation that uses the semantic search approach

type SRHRResponse = {
  answer: string;
  confidence: number;
  source: string;
  category: string;
  similarQuestions?: string[];
};

class OfflineModelService {
  private isInitialized = false;
  private modelData: any = null;
  private embeddings: any = null;

  async initialize() {
    try {
      // Load your model data from local storage or assets
      // This would be the converted TensorFlow.js model from your Colab training
      await this.loadModelData();
      this.isInitialized = true;
      console.log('🤖 Offline model initialized');
    } catch (error) {
      console.error('Failed to initialize offline model:', error);
    }
  }

  private async loadModelData() {
    // Load your pre-processed SRHR data and embeddings
    // For now, we'll use a simplified approach with keyword matching
    // In production, you'd load the actual model files
    
    // Mock data - replace with your actual trained model data
    this.modelData = {
      statements: [
        {
          id: 1,
          text: "The legal age for marriage in Liberia is 18 years for both boys and girls.",
          category: "Legal Framework",
          keywords: ["legal", "age", "marriage", "18", "years", "liberia"]
        },
        {
          id: 2,
          text: "Access to contraception is a fundamental right for all individuals in Liberia.",
          category: "Rights & Principles",
          keywords: ["access", "contraception", "fundamental", "right", "individuals", "liberia"]
        },
        // Add all your 360 statements here
      ]
    };
  }

  async generateResponse(userMessage: string): Promise<SRHRResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Simple keyword-based matching (replace with your actual model inference)
    const bestMatch = this.findBestMatch(userMessage);
    
    if (bestMatch) {
      return {
        answer: bestMatch.text,
        confidence: bestMatch.confidence,
        source: "offline_model",
        category: bestMatch.category,
        similarQuestions: this.getSimilarQuestions(bestMatch.category)
      };
    }

    // Fallback response
    return {
      answer: "I understand you're asking about sexual and reproductive health in Liberia. While I don't have a specific answer for that question in my offline database, I recommend contacting your local health clinic or the Ministry of Health for more detailed information.",
      confidence: 0.1,
      source: "offline_fallback",
      category: "General SRH"
    };
  }

  private findBestMatch(userMessage: string): any {
    const message = userMessage.toLowerCase();
    let bestMatch = null;
    let highestScore = 0;

    for (const statement of this.modelData.statements) {
      let score = 0;
      
      // Simple keyword matching - replace with your actual model inference
      for (const keyword of statement.keywords) {
        if (message.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }

      // Boost score for exact phrase matches
      if (message.includes(statement.text.toLowerCase())) {
        score += 5;
      }

      if (score > highestScore && score > 0) {
        highestScore = score;
        bestMatch = {
          ...statement,
          confidence: Math.min(score / 10, 1.0) // Normalize confidence
        };
      }
    }

    return bestMatch;
  }

  private getSimilarQuestions(category: string): string[] {
    const categoryStatements = this.modelData.statements.filter(
      (s: any) => s.category === category
    ).slice(0, 3);
    
    return categoryStatements.map((s: any) => s.text);
  }

  // Check if we can handle the query offline
  canHandleOffline(query: string): boolean {
    const medicalKeywords = [
      'hiv', 'aids', 'contraception', 'family planning', 'pregnancy', 'maternal',
      'health', 'reproductive', 'sexual', 'marriage', 'age', 'rights', 'liberia',
      'stigma', 'prevention', 'treatment', 'care', 'clinics', 'services'
    ];
    
    const queryLower = query.toLowerCase();
    return medicalKeywords.some(keyword => queryLower.includes(keyword));
  }
}

export const offlineModelService = new OfflineModelService();