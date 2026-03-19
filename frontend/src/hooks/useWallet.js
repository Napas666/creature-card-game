import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

export function useWallet() {
  const [provider, setProvider] = useState(null);
  const [signer,   setSigner]   = useState(null);
  const [address,  setAddress]  = useState(null);
  const [chainId,  setChainId]  = useState(null);
  const [error,    setError]    = useState(null);

  const connect = useCallback(async () => {
    try {
      setError(null);
      if (!window.ethereum) throw new Error('MetaMask not installed');
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const p  = new ethers.BrowserProvider(window.ethereum);
      const s  = await p.getSigner();
      const n  = await p.getNetwork();
      setProvider(p);
      setSigner(s);
      setAddress(await s.getAddress());
      setChainId(Number(n.chainId));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Auto-reconnect if already authorized
  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
      if (accounts.length > 0) connect();
    });

    window.ethereum.on('accountsChanged', connect);
    window.ethereum.on('chainChanged',    connect);
    return () => {
      window.ethereum.removeListener('accountsChanged', connect);
      window.ethereum.removeListener('chainChanged',    connect);
    };
  }, [connect]);

  return { provider, signer, address, chainId, error, connect };
}
