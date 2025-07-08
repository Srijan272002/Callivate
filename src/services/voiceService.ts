import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { StorageService } from './storage';
import { supabase } from './supabase';

export interface Voice {
  id: string;
  name: string;
  provider: string;
  category: string;
  gender?: string;
  personality: string[];
  is_premium: boolean;
  is_free: boolean;
  is_recommended?: boolean;
  description: string;
  features: string[];
  quality_score: number;
  cost_per_character?: number;
  elevenlabs_voice_id?: string;
  preview_url?: string;
}

export interface VoicePreview {
  voice_id: string;
  preview_type: 'browser' | 'elevenlabs' | 'api' | 'react-native';
  text: string;
  audio_data?: string;
  audio_format?: string;
  cost: number;
  is_free: boolean;
  browser_config?: {
    rate: number;
    pitch: number;
    volume: number;
  };
  duration_estimate?: number;
}

// Enhanced voice profiles for each agent
interface VoiceProfile {
  pitch: number;
  rate: number;
  volume: number;
  language: string;
  personality: string;
}

type AgentName = 'sarah' | 'marcus' | 'luna' | 'alex';

const VOICE_PROFILES: Record<AgentName, VoiceProfile> = {
  'sarah': {
    pitch: 1.2,
    rate: 0.9,
    volume: 1.0,
    language: 'en-US',
    personality: 'warm and encouraging'
  },
  'marcus': {
    pitch: 0.7,
    rate: 0.85,
    volume: 1.0,
    language: 'en-US',
    personality: 'confident and motivating'
  },
  'luna': {
    pitch: 1.1,
    rate: 0.95,
    volume: 1.0,
    language: 'en-US',
    personality: 'calm and supportive'
  },
  'alex': {
    pitch: 0.9,
    rate: 0.88,
    volume: 1.0,
    language: 'en-US',
    personality: 'energetic and friendly'
  }
};

// Personalized preview texts for each agent
const AGENT_PREVIEW_TEXTS: Record<AgentName, string> = {
  'sarah': "Hi! I'm Sarah, your warm and caring AI assistant. I'll help you stay on track with gentle reminders and positive encouragement.",
  'marcus': "Hey there! Marcus here - your motivational coach. I'll keep you accountable and push you to achieve your goals!",
  'luna': "Hello, I'm Luna. I bring calm and balance to your productivity journey. Let me help you find your peaceful focus.",
  'alex': "What's up! I'm Alex, your energetic productivity buddy! Ready to tackle those tasks with enthusiasm?"
};

export class VoiceService {
  private static currentSound: Audio.Sound | null = null;
  private static isReactNative = Platform.OS === 'ios' || Platform.OS === 'android';

  /**
   * Get all available voices
   */
  static async getVoices(includePremium: boolean = false): Promise<Voice[]> {
    try {
      const { data, error } = await supabase.functions.invoke('get-voices', {
        body: { 
          include_premium: includePremium,
          is_free_only: false 
        }
      });

      if (error) {
        console.error('Failed to fetch voices:', error);
        return this.getFallbackVoices();
      }

      return data?.voices || this.getFallbackVoices();
    } catch (error) {
      console.error('Error fetching voices:', error);
      return this.getFallbackVoices();
    }
  }

  /**
   * Get voice recommendations for user
   */
  static async getVoiceRecommendations(): Promise<Voice[]> {
    try {
      const { data, error } = await supabase.functions.invoke('get-voice-recommendations');

      if (error) {
        console.error('Failed to fetch voice recommendations:', error);
        return [];
      }

      return data?.recommendations?.map((rec: any) => rec.voice) || [];
    } catch (error) {
      console.error('Error fetching voice recommendations:', error);
      return [];
    }
  }

  /**
   * Preview a voice with sample text - React Native compatible with enhanced agent personalities
   */
  static async previewVoice(voiceId: string, text?: string): Promise<void> {
    try {
      // Stop any currently playing audio
      await this.stopCurrentAudio();

      // Get agent name from voice ID
      const agentName = this.getAgentNameFromVoiceId(voiceId);
      
      // Use personalized preview text if no custom text provided
      const sampleText = text || AGENT_PREVIEW_TEXTS[agentName] || 
        "Hi! This is your AI assistant from Callivate. Have you completed your task today?";

      if (voiceId.startsWith('browser-')) {
        if (this.isReactNative) {
          await this.previewReactNativeVoice(voiceId, sampleText);
        } else {
          await this.previewBrowserVoice(voiceId, sampleText);
        }
      } else {
        await this.previewPremiumVoice(voiceId, sampleText);
      }
    } catch (error) {
      console.error('Error previewing voice:', error);
      throw error;
    }
  }

  /**
   * Get agent name from voice ID
   */
  private static getAgentNameFromVoiceId(voiceId: string): AgentName {
    if (voiceId.includes('sarah') || voiceId === 'browser-female-1') return 'sarah';
    if (voiceId.includes('marcus') || voiceId === 'browser-male-1') return 'marcus';
    if (voiceId.includes('luna') || voiceId === 'browser-female-2') return 'luna';
    if (voiceId.includes('alex') || voiceId === 'browser-male-2') return 'alex';
    
    // Fallback based on gender
    if (voiceId.includes('female')) return 'sarah';
    if (voiceId.includes('male')) return 'marcus';
    
    return 'sarah'; // Default
  }

  /**
   * Preview voice using React Native Expo Speech with enhanced agent profiles
   */
  private static async previewReactNativeVoice(voiceId: string, text: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if speech is available
        const isAvailable = await Speech.isSpeakingAsync();
        
        // Stop any current speech
        if (isAvailable) {
          await Speech.stop();
        }

        // Get agent name and profile
        const agentName = this.getAgentNameFromVoiceId(voiceId);
        const profile = VOICE_PROFILES[agentName] || VOICE_PROFILES.sarah;

        // Configure voice settings with agent-specific profile
        const speechOptions: Speech.SpeechOptions = {
          language: profile.language,
          pitch: profile.pitch,
          rate: profile.rate,
          volume: profile.volume,
        };

        // Set up completion callback
        speechOptions.onDone = () => {
          console.log(`✅ Voice preview completed for ${agentName}`);
          resolve();
        };

        speechOptions.onError = (error: any) => {
          console.error(`❌ Voice preview error for ${agentName}:`, error);
          reject(new Error(`Speech synthesis error: ${error}`));
        };

        speechOptions.onStopped = () => {
          console.log(`🛑 Voice preview stopped for ${agentName}`);
          resolve();
        };

        // Speak the text
        await Speech.speak(text, speechOptions);
        
        console.log(`🔊 Playing ${agentName}'s voice preview with personality: ${profile.personality}`);

      } catch (error) {
        console.error('Error with React Native TTS:', error);
        reject(new Error('Voice preview not available on this device. Voice will work during actual calls.'));
      }
    });
  }

  /**
   * Preview browser TTS voice using Web Speech API with enhanced agent profiles
   */
  private static async previewBrowserVoice(voiceId: string, text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          
          // Get agent name and profile
          const agentName = this.getAgentNameFromVoiceId(voiceId);
          const profile = VOICE_PROFILES[agentName] || VOICE_PROFILES.sarah;
          
          // Configure voice settings with agent-specific profile
          utterance.lang = profile.language;
          utterance.volume = profile.volume;
          utterance.rate = profile.rate;
          utterance.pitch = profile.pitch;

          utterance.onend = () => {
            console.log(`✅ Browser voice preview completed for ${agentName}`);
            resolve();
          };
          utterance.onerror = (error) => {
            console.error(`❌ Browser voice error for ${agentName}:`, error);
            reject(new Error(`Speech synthesis error: ${error.error}`));
          };

          console.log(`🔊 Playing ${agentName}'s browser voice with personality: ${profile.personality}`);
          window.speechSynthesis.speak(utterance);
        } else {
          reject(new Error('Speech synthesis not supported on this device'));
        }
      } catch (error) {
        console.error('Error with browser TTS:', error);
        reject(new Error('Failed to play browser voice preview'));
      }
    });
  }

  /**
   * Preview premium voice (ElevenLabs, etc.)
   */
  private static async previewPremiumVoice(voiceId: string, text: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('preview-voice', {
        body: {
          voice_id: voiceId,
          text: text
        }
      });

      if (error) {
        console.error('Failed to generate voice preview:', error);
        throw new Error('Failed to generate voice preview');
      }

      const preview: VoicePreview = data.voice_preview;

      if (preview.preview_type === 'elevenlabs' && preview.audio_data) {
        await this.playBase64Audio(preview.audio_data, preview.audio_format || 'mp3');
      } else {
        throw new Error('Unsupported preview type');
      }
    } catch (error) {
      console.error('Error with premium voice preview:', error);
      throw error;
    }
  }

  /**
   * Play base64 encoded audio
   */
  private static async playBase64Audio(base64Data: string, format: string): Promise<void> {
    try {
      // Create audio blob from base64
      const audioUri = `data:audio/${format};base64,${base64Data}`;
      
      // Create and play sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true, volume: 1.0 }
      );

      this.currentSound = sound;

      // Set up playback status listener
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          this.currentSound = null;
        }
      });
    } catch (error) {
      console.error('Error playing base64 audio:', error);
      throw new Error('Failed to play audio preview');
    }
  }

  /**
   * Stop currently playing audio - React Native compatible
   */
  static async stopCurrentAudio(): Promise<void> {
    try {
      // Stop React Native Speech
      if (this.isReactNative) {
        const isSpeaking = await Speech.isSpeakingAsync();
        if (isSpeaking) {
          await Speech.stop();
        }
      }

      // Stop Web Speech if available
      if (!this.isReactNative && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      // Stop and unload current sound
      if (this.currentSound) {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
        this.currentSound = null;
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }

  /**
   * Set user's default voice
   */
  static async setDefaultVoice(voiceId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('set-default-voice', {
        body: { voice_id: voiceId }
      });

      if (error) {
        console.error('Failed to set default voice:', error);
        throw new Error('Failed to set default voice');
      }

      // Cache locally
      await StorageService.setItem('default_voice_id', voiceId);
    } catch (error) {
      console.error('Error setting default voice:', error);
      throw error;
    }
  }

  /**
   * Get user's current default voice
   */
  static async getDefaultVoice(): Promise<string> {
    try {
      // Try to get from cache first
      const cachedVoice = await StorageService.getItem('default_voice_id');
      if (cachedVoice) {
        return cachedVoice;
      }

      // Fetch from server
      const { data, error } = await supabase.functions.invoke('get-user-preferences');
      
      if (error) {
        console.error('Failed to get user preferences:', error);
        return 'browser-default-female'; // fallback
      }

      const defaultVoice = data?.settings?.default_voice_id || 'browser-default-female';
      
      // Cache for next time
      await StorageService.setItem('default_voice_id', defaultVoice);
      
      return defaultVoice;
    } catch (error) {
      console.error('Error getting default voice:', error);
      return 'browser-default-female';
    }
  }

  /**
   * Fallback voices when API is unavailable
   */
  static getFallbackVoices(): Voice[] {
    return [
      {
        id: 'browser-default-female',
        name: 'Browser Female Voice',
        provider: 'browser',
        category: 'standard',
        gender: 'female',
        personality: ['friendly', 'professional'],
        is_premium: false,
        is_free: true,
        description: 'Uses your device\'s built-in female voice (completely free)',
        features: ['Cross-platform', 'No API costs', 'Instant playback'],
        quality_score: 7.5
      },
      {
        id: 'browser-default-male',
        name: 'Browser Male Voice',
        provider: 'browser',
        category: 'standard',
        gender: 'male',
        personality: ['friendly', 'professional'],
        is_premium: false,
        is_free: true,
        description: 'Uses your device\'s built-in male voice (completely free)',
        features: ['Cross-platform', 'No API costs', 'Instant playback'],
        quality_score: 7.5
      },
      {
        id: 'browser-default-neutral',
        name: 'Browser Neutral Voice',
        provider: 'browser',
        category: 'standard',
        gender: 'neutral',
        personality: ['calm', 'professional'],
        is_premium: false,
        is_free: true,
        description: 'Uses your device\'s built-in neutral voice (completely free)',
        features: ['Cross-platform', 'No API costs', 'Instant playback'],
        quality_score: 7.5
      }
    ];
  }

  /**
   * Test if voice is available
   */
  static async testVoiceAvailability(voiceId: string): Promise<boolean> {
    try {
      if (voiceId.startsWith('browser-')) {
        return typeof window !== 'undefined' && 'speechSynthesis' in window;
      } else {
        // For premium voices, try a quick API test
        const { error } = await supabase.functions.invoke('test-voice', {
          body: { voice_id: voiceId }
        });
        return !error;
      }
    } catch (error) {
      console.error('Error testing voice availability:', error);
      return false;
    }
  }

  /**
   * Get voice cost estimate
   */
  static getVoiceCost(voice: Voice, textLength: number): number {
    if (voice.is_free) {
      return 0;
    }
    return (voice.cost_per_character || 0.0001) * textLength;
  }
} 