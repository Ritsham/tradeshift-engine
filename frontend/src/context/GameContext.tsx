import React, { useState, useEffect, createContext, useContext } from 'react';

/**
 * TYPES & INTERFACES
 */
export interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  timestamp: Date;
  status: 'OPEN' | 'CLOSED';
}

interface GameState {
  isPlaying: boolean;
  speed: number;
  balance: number;
  currentPrice: number;
  trades: Trade[];
  theme: 'light' | 'dark';      // <--- Added this line
  toggleTheme: () => void;      // <--- Added this line
  togglePlay: () => void;
  setSpeed: (s: number) => void;
  placeOrder: (type: 'BUY' | 'SELL', qty: number) => void;
  closePosition: (tradeId: string) => void;
  resetSimulation: () => void;
}

const INITIAL_PRICE = 21500;
const INITIAL_BALANCE = 100000;

const GameContext = createContext<GameState | null>(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within GameProvider");
  return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [currentPrice, setCurrentPrice] = useState(INITIAL_PRICE);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // <--- Added State

  // Theme Effect: Updates the HTML tag for Tailwind's 'dark' mode to work
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  // Simulation Loop
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentPrice(prev => {
          const change = (Math.random() - 0.5) * 10;
          return prev + change;
        });
      }, 1000 / speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark'); // <--- Added Function
  
  const placeOrder = (type: 'BUY' | 'SELL', quantity: number) => {
    const newTrade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: "NIFTY 50",
      type,
      entryPrice: currentPrice,
      quantity,
      timestamp: new Date(),
      status: 'OPEN'
    };
    setTrades([newTrade, ...trades]);
  };

  const closePosition = (tradeId: string) => {
    setTrades(prevTrades => prevTrades.map(trade => {
      if (trade.id === tradeId && trade.status === 'OPEN') {
        const exitPrice = currentPrice;
        const multiplier = trade.type === 'BUY' ? 1 : -1;
        const pnl = (exitPrice - trade.entryPrice) * trade.quantity * multiplier;
        setBalance(prev => prev + pnl);
        return { ...trade, status: 'CLOSED', exitPrice, pnl };
      }
      return trade;
    }));
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setBalance(INITIAL_BALANCE);
    setCurrentPrice(INITIAL_PRICE);
    setTrades([]);
  };

  return (
    <GameContext.Provider value={{ 
      isPlaying, speed, balance, currentPrice, trades, theme, 
      togglePlay, setSpeed, placeOrder, closePosition, resetSimulation, toggleTheme 
    }}>
      {children}
    </GameContext.Provider>
  );
};