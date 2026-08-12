import { createContext, useContext, useState, type ReactNode } from "react";
import type { ExecutedTrade, AgentConsideration, AgentEvaluation } from "@/hooks/useLiveTrading";

interface TradingDataContextValue {
  executedTrades: ExecutedTrade[];
  considerations: AgentConsideration[];
  evaluations: AgentEvaluation[];
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
  /** Maps trade IDs to the agent ID that "executed" them */
  tradeAgentMap: Record<string, string>;
  setTradeAgentMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const TradingDataContext = createContext<TradingDataContextValue>({
  executedTrades: [],
  considerations: [],
  evaluations: [],
  selectedAgentId: null,
  setSelectedAgentId: () => {},
  tradeAgentMap: {},
  setTradeAgentMap: () => {},
});

export function TradingDataProvider({
  children,
  executedTrades,
  considerations,
  evaluations,
}: { executedTrades: ExecutedTrade[]; considerations: AgentConsideration[]; evaluations: AgentEvaluation[]; children: ReactNode }) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [tradeAgentMap, setTradeAgentMap] = useState<Record<string, string>>({});

  return (
    <TradingDataContext.Provider value={{ executedTrades, considerations, evaluations, selectedAgentId, setSelectedAgentId, tradeAgentMap, setTradeAgentMap }}>
      {children}
    </TradingDataContext.Provider>
  );
}

export function useTradingData() {
  return useContext(TradingDataContext);
}
