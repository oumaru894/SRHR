// src/services/NetworkService.ts
import NetInfo from '@react-native-community/netinfo';

class NetworkService {
  private isOnline = true;

  constructor() {
    this.initializeNetworkListener();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      console.log(`🌐 Network status: ${this.isOnline ? 'Online' : 'Offline'}`);
    });
  }

  async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    return this.isOnline;
  }

  isConnected(): boolean {
    return this.isOnline;
  }
}

export const networkService = new NetworkService();