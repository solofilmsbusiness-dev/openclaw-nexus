import { createContext, useContext, type ReactNode } from "react";
import type { ExecutedTrade, AgentConsideration, AgentEvaluation } from "@/hooks/useTradingSimulation";

interface TradingDataContextValue {
  executedTrades: ExecutedTrade[];
  considerations: AgentConsideration[];
  evaluations: AgentEvaluation[];
}

const TradingDataContext = createContext<TradingDataContextValue>({
  executedTrades: [],
  considerations: [],
  evaluations: [],
});

export function TradingDataProvider({
  children,
  executedTrades,
  considerations,
  evaluations,
}: TradingDataContextValue & { children: ReactNode }) {
  return (
    <TradingDataContext.Provider value={{ executedTrades, considerations, evaluations }}>
      {children}
    </TradingDataContext.Provider>
  );
}

export function useTradingData() {
  return useContext(TradingDataContext);
}
