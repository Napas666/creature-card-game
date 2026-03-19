import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import BattleEngineABI from '../abis/BattleEngine.json';
import { CONTRACT_ADDRESSES } from '../utils/contractConfig.js';

export function useBattle(signer, provider) {
  const [battleId,  setBattleId]  = useState(null);
  const [battle,    setBattle]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const getContract = useCallback((s) => {
    return new ethers.Contract(CONTRACT_ADDRESSES.BattleEngine, BattleEngineABI, s);
  }, []);

  const challenge = useCallback(async (myTokenId, opponentTokenId) => {
    if (!signer) return;
    setLoading(true);
    setError(null);
    try {
      const engine  = getContract(signer);
      const tx      = await engine.challenge(myTokenId, opponentTokenId);
      const receipt = await tx.wait();

      // Parse BattleCreated event to get battleId
      const iface   = engine.interface;
      const log     = receipt.logs.find(l => {
        try { return iface.parseLog(l)?.name === 'BattleCreated'; }
        catch { return false; }
      });
      const parsed   = iface.parseLog(log);
      const newBattleId = Number(parsed.args.battleId);
      setBattleId(newBattleId);
      return newBattleId;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [signer, getContract]);

  const acceptAndResolve = useCallback(async (bId, myTokenId) => {
    if (!signer) return;
    setLoading(true);
    setError(null);
    try {
      const engine  = getContract(signer);
      const tx      = await engine.acceptAndResolve(bId, myTokenId);
      const receipt = await tx.wait();

      // Parse BattleResolved event
      const iface  = engine.interface;
      const log    = receipt.logs.find(l => {
        try { return iface.parseLog(l)?.name === 'BattleResolved'; }
        catch { return false; }
      });
      if (log) {
        const parsed = iface.parseLog(log);
        return {
          winnerToken: Number(parsed.args.winnerToken),
          loserToken:  Number(parsed.args.loserToken),
          rounds:      Number(parsed.args.rounds),
        };
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [signer, getContract]);

  const fetchBattle = useCallback(async (bId) => {
    if (!provider) return;
    try {
      const engine = getContract(provider);
      const b      = await engine.getBattle(bId);
      const result = {
        challengerTokenId: Number(b.challengerTokenId),
        opponentTokenId:   Number(b.opponentTokenId),
        challenger:        b.challenger,
        opponent:          b.opponent,
        winner:            Number(b.winner),
        loser:             Number(b.loser),
        rounds:            Number(b.rounds),
        timestamp:         Number(b.timestamp),
      };
      setBattle(result);
      return result;
    } catch (e) {
      setError(e.message);
    }
  }, [provider, getContract]);

  return { battleId, battle, loading, error, challenge, acceptAndResolve, fetchBattle };
}
