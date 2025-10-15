import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

type NetworkContextType = {
  isConnected: boolean;
  connectionType: string | null;
};

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  connectionType: null,
});

export const NetworkProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);

  useEffect(() => {
    // Initial check
    const checkConnection = async () => {
      const state = await NetInfo.fetch();
      setIsConnected(state.isConnected ?? false);
      setConnectionType(state.type ?? null);
    };
    checkConnection();

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
      setConnectionType(state.type ?? null);
    });

    // Set up periodic connection checks
    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds

    // Cleanup on unmount
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected, connectionType }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
