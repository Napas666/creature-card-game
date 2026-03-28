import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import BattleEngineABI from '../abis/BattleEngine.json';
import { CONTRACT_ADDRESSES } from '../utils/contractConfig.js';

export function useBattle(signer, provider) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const getContract = useCallback((s) =>
    new ethers.Contract(CONTRACT_ADDRESSES.BattleEngine, BattleEngineABI, s), []);

  // Single transaction: caller's card vs opponent card
  const battle = useCallback(async (myTokenId, opponentTokenId) => {
    if (!signer) return null;
    setLoading(true); setError(null);
    try {
      const engine  = getContract(signer);
      const tx      = await engine.battle(myTokenId, opponentTokenId);
      const receipt = await tx.wait();

      const iface = engine.interface;
      const log   = receipt.logs.find(l => {
        try { return iface.parseLog(l)?.name === 'BattleResolved'; }
        catch { return false; }
      });
      if (!log) throw new Error('BattleResolved event not found in receipt');
      const parsed = iface.parseLog(log);
      return {
        winnerToken: Number(parsed.args.winnerToken),
        loserToken:  Number(parsed.args.loserToken),
        rounds:      Number(parsed.args.rounds),
      };
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [signer, getContract]);

  return { loading, error, battle };
}
