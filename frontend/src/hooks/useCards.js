import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import CreatureCardArtifact from '../abis/CreatureCard.json';
import CardMinterArtifact   from '../abis/CardMinter.json';
const CreatureCardABI = CreatureCardArtifact.abi;
const CardMinterABI   = CardMinterArtifact.abi;
import { CONTRACT_ADDRESSES } from '../utils/contractConfig.js';

export const PACK_RARITY = { COMMON: 0, RARE: 1, LEGENDARY: 2, ELEMENTAL: 3 };

export const PACK_INFO = [
  { rarity: 0, name: 'Common',    icon: '📦', price: '0.01', count: 3, statRange: '10–65',  color: '#8899aa', desc: 'Случайные существа'       },
  { rarity: 1, name: 'Rare',      icon: '💎', price: '0.03', count: 3, statRange: '40–85',  color: '#4488ff', desc: 'Сильные существа'          },
  { rarity: 2, name: 'Legendary', icon: '👑', price: '0.08', count: 2, statRange: '75–100', color: '#ffaa00', desc: 'Элитные существа'           },
  { rarity: 3, name: 'Elemental', icon: '✨', price: '0.02', count: 4, statRange: '25–75',  color: '#aa44ff', desc: 'Выбери стихию — 4 существа' },
];

// Transfer(address,address,uint256) topic
const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

function parseNewTokenIds(receipt) {
  const cardAddr = CONTRACT_ADDRESSES.CreatureCard.toLowerCase();
  return receipt.logs
    .filter(l => l.address.toLowerCase() === cardAddr && l.topics[0] === TRANSFER_TOPIC)
    .map(l => Number(BigInt(l.topics[3])));
}

export function useCards(signer, provider) {
  const [cards,   setCards]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const cardContract   = useCallback((sp) => new ethers.Contract(CONTRACT_ADDRESSES.CreatureCard, CreatureCardABI, sp), []);
  const minterContract = useCallback((sp) => new ethers.Contract(CONTRACT_ADDRESSES.CardMinter,   CardMinterABI,   sp), []);

  const fetchCardById = useCallback(async (id) => {
    const c = cardContract(provider);
    const s = await c.getStats(id);
    return {
      id,
      attack:      Number(s.attack),
      health:      Number(s.health),
      speed:       Number(s.speed),
      abilityType: Number(s.abilityType),
      wins:        Number(s.wins),
      losses:      Number(s.losses),
      level:       Number(s.level),
      mintedAt:    Number(s.mintedAt),
    };
  }, [provider, cardContract]);

  const loadMyCards = useCallback(async (address) => {
    if (!provider || !address) return;
    setLoading(true); setError(null);
    try {
      const c     = cardContract(provider);
      const total = await c.totalSupply();
      const owned = [];
      for (let i = 0; i < Number(total); i++) {
        try {
          const owner = await c.ownerOf(i);
          if (owner.toLowerCase() === address.toLowerCase())
            owned.push(await fetchCardById(i));
        } catch {}
      }
      setCards(owned);
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, [provider, cardContract, fetchCardById]);

  // Returns array of new card objects on success, null on failure
  const openPack = useCallback(async (rarity = PACK_RARITY.COMMON) => {
    if (!signer) return null;
    setLoading(true); setError(null);
    try {
      const m      = minterContract(signer);
      const cfg    = await m.packs(rarity);
      const tx     = await m.openPack(rarity, { value: cfg.price });
      const receipt = await tx.wait();
      const newIds  = parseNewTokenIds(receipt);
      return await Promise.all(newIds.map(id => fetchCardById(id)));
    } catch (e) { setError(e.message); return null; }
    finally     { setLoading(false); }
  }, [signer, minterContract, fetchCardById]);

  const openElementalPack = useCallback(async (abilityType) => {
    if (!signer) return null;
    setLoading(true); setError(null);
    try {
      const m       = minterContract(signer);
      const cfg     = await m.packs(PACK_RARITY.ELEMENTAL);
      const tx      = await m.openElementalPack(abilityType, { value: cfg.price });
      const receipt = await tx.wait();
      const newIds  = parseNewTokenIds(receipt);
      return await Promise.all(newIds.map(id => fetchCardById(id)));
    } catch (e) { setError(e.message); return null; }
    finally     { setLoading(false); }
  }, [signer, minterContract, fetchCardById]);

  return { cards, loading, error, loadMyCards, openPack, openElementalPack };
}
