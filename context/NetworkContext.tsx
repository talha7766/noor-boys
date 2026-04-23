import NetInfo from "@react-native-community/netinfo";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type NetworkContextType = {
  networkError: boolean;
  isConnected: boolean;
  justRestored: boolean; // ✅ NEW
};

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [justRestored, setJustRestored] = useState(false);

  const prevConnected = useRef(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = !!state.isConnected && !!state.isInternetReachable;

      // Detect OFF → ON
      if (!prevConnected.current && connected) {
        setJustRestored(true);

        // auto-hide success message
        setTimeout(() => setJustRestored(false), 3000);
      }

      setIsConnected(connected);
      setNetworkError(!connected);
      prevConnected.current = connected;
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider
      value={{ networkError, isConnected, justRestored }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context)
    throw new Error("useNetwork must be used inside NetworkProvider");
  return context;
};
