// src/services/TFJSModelService.ts
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';

// Import your model assets (you'll need to add these to your project)
// For now, we'll create a mock implementation

class TFJSModelService {
  private model: tf.GraphModel | null = null;
  private tokenizer: any = null;
  private labelMappings: any = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize TensorFlow
      await tf.ready();
      console.log('✅ TensorFlow.js is ready');

      // Load model (you'll need to add the converted model files to your project)
      // this.model = await this.loadModel();
      
      // Load tokenizer and label mappings
      this.labelMappings = await this.loadLabelMappings();
      
      this.isInitialized = true;
      console.log('🤖 TFJS Model Service initialized');
    } catch (error) {
      console.error('Failed to initialize TFJS model:', error);
      // Fall back to keyword matching
      this.initializeFallback();
    }
  }

  private async loadModel(): Promise<tf.GraphModel> {
    // This is where you'd load your actual converted TensorFlow.js model
    // For now, we'll return a mock
    
    // Example of how to load a bundled model:
    // const modelJson = require('../assets/model/model.json');
    // const modelWeights = require('../assets/model/weights.bin');
    // return await tf.loadGraphModel(bundleResourceIO(modelJson, modelWeights));
    
    throw new Error('Model loading not implemented - using fallback');
  }

  private async loadLabelMappings() {
    // Load from your bundled assets or AsyncStorage
    try {
      // Example: Load from bundled asset
      // const mappings = require('../assets/model/label_mappings.json');
      // return mappings;
      
      // Fallback to hardcoded mappings
      return {
        id2label: {
          "0": "Legal Framework",
          "1": "Rights & Principles", 
          "2": "Maternal Health",
          "3": "Family Planning",
          "4": "HIV & STIs",
          "5": "Adolescent Health",
          "6": "GBV & Rights",
          "7": "General SRH"
        },
        label2id: {
          "Legal Framework": 0,
          "Rights & Principles": 1,
          "Maternal Health": 2,
          "Family Planning": 3,
          "HIV & STIs": 4,
          "Adolescent Health": 5,
          "GBV & Rights": 6,
          "General SRH": 7
        }
      };
    } catch (error) {
      console.error('Failed to load label mappings:', error);
      return null;
    }
  }

  private initializeFallback() {
    console.log('🔄 Initializing fallback keyword matcher');
    this.isInitialized = true;
  }

  async classifyText(text: string): Promise<{label: string; confidence: number}> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // If we have a real TF.js model, use it
    if (this.model && this.labelMappings) {
      return await this.classifyWithModel(text);
    }

    // Otherwise, use keyword-based fallback
    return this.classifyWithKeywords(text);
  }

  private async classifyWithModel(text: string): Promise<{label: string; confidence: number}> {
    try {
      // Preprocess text (you'll need to implement this based on your tokenizer)
      const input = this.preprocessText(text);
      
      // Run inference
      const prediction = this.model!.predict(input) as tf.Tensor;
      const probabilities = await prediction.data();
      
      // Get highest probability
      const maxIndex = probabilities.indexOf(Math.max(...probabilities));
      const confidence = probabilities[maxIndex];
      
      // Clean up
      input.dispose();
      prediction.dispose();
      
      return {
        label: this.labelMappings.id2label[maxIndex.toString()] || 'General SRH',
        confidence
      };
    } catch (error) {
      console.error('Model inference failed:', error);
      return this.classifyWithKeywords(text);
    }
  }

  private preprocessText(text: string): any {
    // Implement text preprocessing based on your tokenizer
    // This would convert text to the format your model expects
    // For now, return a mock tensor
    return tf.tensor2d([[1, 2, 3]]); // Replace with actual preprocessing
  }

  private classifyWithKeywords(text: string): {label: string; confidence: number} {
    const lowerText = text.toLowerCase();
    
    // Keyword to category mapping
    const keywordMap: {[key: string]: string} = {
      // Legal Framework
      'legal': 'Legal Framework',
      'law': 'Legal Framework', 
      'marriage': 'Legal Framework',
      'age': 'Legal Framework',
      'right': 'Legal Framework',
      
      // Rights & Principles
      'contraception': 'Rights & Principles',
      'access': 'Rights & Principles',
      'fundamental': 'Rights & Principles',
      'decision': 'Rights & Principles',
      
      // Maternal Health
      'pregnant': 'Maternal Health',
      'pregnancy': 'Maternal Health',
      'maternal': 'Maternal Health',
      'birth': 'Maternal Health',
      'childbirth': 'Maternal Health',
      
      // Family Planning
      'family planning': 'Family Planning',
      'contraceptive': 'Family Planning',
      'birth control': 'Family Planning',
      'planning': 'Family Planning',
      
      // HIV & STIs
      'hiv': 'HIV & STIs',
      'aids': 'HIV & STIs',
      'sti': 'HIV & STIs',
      'std': 'HIV & STIs',
      'virus': 'HIV & STIs',
      
      // Adolescent Health
      'teen': 'Adolescent Health',
      'adolescent': 'Adolescent Health',
      'young': 'Adolescent Health',
      'youth': 'Adolescent Health',
      
      // GBV & Rights
      'violence': 'GBV & Rights',
      'abuse': 'GBV & Rights',
      'gender': 'GBV & Rights',
      'rape': 'GBV & Rights',
      'fgm': 'GBV & Rights'
    };

    let bestMatch = 'General SRH';
    let maxScore = 0;

    for (const [keyword, category] of Object.entries(keywordMap)) {
      const score = (lowerText.match(new RegExp(keyword, 'gi')) || []).length;
      if (score > maxScore) {
        maxScore = score;
        bestMatch = category;
      }
    }

    // Calculate confidence based on keyword matches
    const confidence = Math.min(maxScore / 5, 0.8); // Cap at 0.8 for keyword matching

    return {
      label: bestMatch,
      confidence
    };
  }
}

export const tfjsModelService = new TFJSModelService();