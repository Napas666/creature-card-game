import { useState, useEffect } from 'react';
import { useWallet }      from './hooks/useWallet.js';
import { useCards }       from './hooks/useCards.js';
import { useBattle }      from './hooks/useBattle.js';
import { WalletConnect }  from './components/WalletConnect.jsx';
import { CardCollection } from './components/CardCollection.jsx';
import { BattleArena }    from './components/BattleArena.jsx';

export default function App() {
  const { provider, signer, address, chainId, error: walletError, connect } = useWallet();
  const { cards, loading: cardsLoading, error: cardsError, loadMyCards, openPack } = useCards(signer, provider);
  const { loading: battleLoading, error: battleError, challenge, acceptAndResolve } = useBattle(signer, provider);

  const [selectedCards, setSelectedCards] = useState([]);
  const [battleResult,  setBattleResult]  = useState(null);
  const [battleView,    setBattleView]    = useState(false);

  useEffect(() => {
    if (address) loadMyCards(address);
  }, [address]);

  const handleSelectCard = (card) => {
    setSelectedCards(prev => {
      if (prev.find(c => c.id === card.id)) return prev.filter(c => c.id !== card.id);
      if (prev.length >= 2) return [prev[1], card];
      return [...prev, card];
    });
  };

  const handleOpenPack = async () => {
    await openPack();
    await loadMyCards(address);
  };

  const handleStartBattle = async () => {
    if (selectedCards.length < 2) return;
    const [myCard, opponentCard] = selectedCards;
    setBattleResult(null);
    setBattleView(true);

    // Demo: same wallet owns both cards (local dev). In production, opponent calls acceptAndResolve.
    const bId = await challenge(myCard.id, opponentCard.id);
    if (bId == null) return;
    const result = await acceptAndResolve(bId, opponentCard.id);
    if (result) setBattleResult({ ...result, myCardId: myCard.id });
    await loadMyCards(address);
  };

  const error = (walletError ? null : cardsError) || battleError;

  return (
    <div style={{ minHeight: '100vh', background: '#080818', color: '#dde', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, color: '#aabbff', letterSpacing: 2 }}>⚡ CREATURE CARDS</h1>
        <WalletConnect address={address} chainId={chainId} error={walletError} onConnect={connect} />
      </div>

      {error && (
        <div style={{ background: '#400', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: '#faa' }}>
          {error}
        </div>
      )}

      {!address ? (
        <div style={{ textAlign: 'center', marginTop: 80, color: '#445' }}>
          <div style={{ fontSize: 64 }}>🐉</div>
          <p style={{ fontSize: 18, marginTop: 16, color: '#889' }}>Подключите MetaMask чтобы начать</p>
          <div style={{ background: '#0a0a20', border: '1px solid #224', borderRadius: 10, padding: 20, display: 'inline-block', textAlign: 'left', marginTop: 16 }}>
            <p style={{ margin: '0 0 8px', color: '#556', fontSize: 13 }}>Локальный запуск:</p>
            <code style={{ color: '#8af', fontSize: 12 }}>anvil</code><br />
            <code style={{ color: '#8af', fontSize: 12 }}>forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast</code>
          </div>
        </div>
      ) : (
        <>
          <CardCollection
            cards={cards}
            selectedIds={selectedCards.map(c => c.id)}
            onSelectCard={handleSelectCard}
            onOpenPack={handleOpenPack}
            loading={cardsLoading}
          />

          {selectedCards.length === 2 && (
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#889' }}>
                Выбрано: <strong style={{ color: '#aaf' }}>#{selectedCards[0].id}</strong> vs <strong style={{ color: '#aaf' }}>#{selectedCards[1].id}</strong>
              </span>
              <button
                onClick={handleStartBattle}
                disabled={battleLoading}
                style={{
                  background:   battleLoading ? '#333' : '#cc3300',
                  color:        '#fff',
                  border:       'none',
                  borderRadius: 8,
                  padding:      '10px 28px',
                  cursor:       battleLoading ? 'default' : 'pointer',
                  fontSize:     16,
                  fontWeight:   700,
                }}
              >
                {battleLoading ? 'Ждём блокчейн...' : '⚔️ Начать бой!'}
              </button>
              <button
                onClick={() => { setBattleView(false); setBattleResult(null); }}
                style={{ background: 'transparent', color: '#556', border: '1px solid #334', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}
              >
                Закрыть арену
              </button>
            </div>
          )}

          {battleView && selectedCards.length === 2 && (
            <div style={{ marginTop: 32 }}>
              <BattleArena
                challengerCard={selectedCards[0]}
                opponentCard={selectedCards[1]}
                battleResult={battleResult}
                onBattleEnd={() => {}}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
