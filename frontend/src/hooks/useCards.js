import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import CreatureCardABI from '../abis/CreatureCard.json';
import CardMinterABI   from '../abis/CardMinter.json';
import { CONTRACT_ADDRESSES } from '../utils/contractConfig.js';

export function useCards(signer, provider) {
  const [cards,   setCards]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const getCardContract = useCallback((signerOrProvider) => {
    return new ethers.Contract(
      CONTRACT_ADDRESSES.CreatureCard,
      CreatureCardABI,
      signerOrProvider
    );
  }, []);

  const getMinterContract = useCallback((s) => {
    return new ethers.Contract(CONTRACT_ADDRESSES.CardMinter, CardMinterABI, s);
  }, []);

  const loadMyCards = useCallback(async (address) => {
    if (!provider || !address) return;
    setLoading(true);
    setError(null);
    try {
      const contract = getCardContract(provider);
      const balance  = await contract.balanceOf(address);
      const total    = await contract.totalSupply();

      const owned = [];
      // Scan all tokens to find ones owned by address (simple approach for local dev)
      for (let i = 0; i < Number(total); i++) {
        try {
          const owner = await contract.ownerOf(i);
          if (owner.toLowerCase() === address.toLowerCase()) {
            const stats = await contract.getStats(i);
            owned.push({
              id:          i,
              attack:      Number(stats.attack),
              health:      Number(stats.health),
              speed:       Number(stats.speed),
              abilityType: Number(stats.abilityType),
              wins:        Number(stats.wins),
              losses:      Number(stats.losses),
              mintedAt:    Number(stats.mintedAt),
            });
          }
        } catch { /* token burned or does not exist */ }
      }
      setCards(owned);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [provider, getCardContract]);

  const openPack = useCallback(async () => {
    if (!signer) return;
    setLoading(true);
    setError(null);
    try {
      const minter = getMinterContract(signer);
      const price  = await minter.mintPrice();
      const size   = await minter.packSize();
      const total  = price * size;
      const tx     = await minter.openPack({ value: total });
      const receipt = await tx.wait();
      return receipt;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [signer, getMinterContract]);

  return { cards, loading, error, loadMyCards, openPack };
}
