import { useState, useEffect } from 'react';
import { useWallet }          from './hooks/useWallet.js';
import { useCards }           from './hooks/useCards.js';
import { useBattle }          from './hooks/useBattle.js';
import { WalletConnect }      from './components/WalletConnect.jsx';
import { CardCollection }     from './components/CardCollection.jsx';
import { BattleArena }        from './components/BattleArena.jsx';
import { PackOpeningScene }   from './components/PackOpeningScene.jsx';

export const ABILITY_COLORS = { 0:'#ff5522', 1:'#44ccff', 2:'#ffee22', 3:'#44ff88', 4:'#cc44ff' };
export const ABILITY_NAMES  = { 0:'FIRE', 1:'ICE', 2:'LIGHTNING', 3:'POISON', 4:'VOID' };

export default function App() {
  const { provider, signer, address, chainId, error: walletError, connect } = useWallet();
  const { cards, loading: cardsLoading, error: cardsError, loadMyCards, openPack, openElementalPack } = useCards(signer, provider);
  const { loading: battleLoading, error: battleError, battle } = useBattle(signer, provider);

  const [selectedCards, setSelectedCards] = useState([]);
  const [battleResult,  setBattleResult]  = useState(null);
  const [battleView,    setBattleView]    = useState(false);

  // Pack opening animation state
  const [packScene, setPackScene] = useState(null); // { rarity, newCards }

  useEffect(() => { if (address) loadMyCards(address); }, [address]);

  const handleSelectCard = (card) => {
    setSelectedCards(prev => {
      if (prev.find(c => c.id === card.id)) return prev.filter(c => c.id !== card.id);
      if (prev.length >= 2) return [prev[1], card];
      return [...prev, card];
    });
  };

  const handleOpenPack = async (rarity) => {
    const newCards = await openPack(rarity);
    await loadMyCards(address);
    if (newCards && newCards.length > 0) setPackScene({ rarity, newCards });
  };

  const handleOpenElementalPack = async (abilityType) => {
    const newCards = await openElementalPack(abilityType);
    await loadMyCards(address);
    if (newCards && newCards.length > 0) setPackScene({ rarity: 3, newCards });
  };

  const handleStartBattle = async () => {
    if (selectedCards.length < 2) return;
    const [myCard, opponentCard] = selectedCards;
    setBattleResult(null);
    setBattleView(true);
    const result = await battle(myCard.id, opponentCard.id);
    if (result) setBattleResult({ ...result, myCardId: myCard.id });
    await loadMyCards(address);
  };

  const error = walletError || cardsError || battleError;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '20px 24px' }}>

      {/* Pack opening modal */}
      {packScene && (
        <PackOpeningScene
          packRarity={packScene.rarity}
          newCards={packScene.newCards}
          onClose={() => setPackScene(null)}
        />
      )}

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                       marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 36 }} className="float">🐉</span>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: 3,
                         background: 'linear-gradient(90deg, #4466ff, #aa44ff)',
                         WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                className="glow">
              CREATURE CARDS
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: 2, marginTop: 2 }}>
              BLOCKCHAIN BATTLE ARENA · SEPOLIA
            </p>
          </div>
        </div>
        <WalletConnect address={address} chainId={chainId} error={walletError} onConnect={connect} />
      </header>

      {/* Error banner */}
      {error && (
        <div className="fade-in" style={{ background: '#2a0808', border: '1px solid #660000',
                       borderRadius: 10, padding: '10px 18px', marginBottom: 20,
                       color: '#ff8888', fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Not connected */}
      {!address ? (
        <div style={{ textAlign: 'center', marginTop: 80 }} className="fade-in">
          <div style={{ fontSize: 72, marginBottom: 24 }} className="float">⚔️</div>
          <h2 style={{ fontSize: 24, marginBottom: 12, color: '#8899ff' }}>Подключите кошелёк</h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: 32, fontSize: 15 }}>
            Сеть Sepolia · MetaMask
          </p>
          <div style={{ display: 'inline-grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
                        textAlign: 'center', marginTop: 8 }}>
            {[
              { icon: '🏪', title: 'Купи пак',   desc: 'Выбери рарность, подтверди в MetaMask' },
              { icon: '⚔️', title: 'Сразись',    desc: 'Выбери 2 существа и начни бой' },
              { icon: '🏆', title: 'Побеждай',   desc: 'Победы прокачивают статы навсегда' },
            ].map(f => (
              <div key={f.title} style={{ background: 'var(--bg3)', border: '1px solid var(--border)',
                           borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
          {/* How packs work */}
          <div style={{ marginTop: 40, background: '#08081e', border: '1px solid #181848',
                        borderRadius: 14, padding: '20px 28px', maxWidth: 500, margin: '40px auto 0',
                        textAlign: 'left' }}>
            <h3 style={{ fontSize: 14, color: '#556699', letterSpacing: 2, marginBottom: 14 }}>
              📖 КАК ОТКРЫТЬ ПАК
            </h3>
            {[
              ['1', 'Подключи кошелёк MetaMask (Sepolia)', '#4466ff'],
              ['2', 'Перейди в 🏪 МАГ. ЛАВКУ и выбери пак', '#aa44ff'],
              ['3', 'Нажми кнопку — MetaMask откроет запрос', '#44aaff'],
              ['4', 'Подтверди транзакцию, оплати ETH', '#ffaa44'],
              ['5', 'Анимация покажет твоих новых существ!', '#44ff88'],
            ].map(([n, text, color]) => (
              <div key={n} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={{ background: color + '22', color, border: `1px solid ${color}44`,
                               borderRadius: '50%', width: 22, height: 22, minWidth: 22,
                               display: 'flex', alignItems: 'center', justifyContent: 'center',
                               fontSize: 11, fontWeight: 700 }}>{n}</span>
                <span style={{ fontSize: 13, color: '#667799', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="fade-in">
          <CardCollection
            cards={cards}
            selectedIds={selectedCards.map(c => c.id)}
            onSelectCard={handleSelectCard}
            onOpenPack={handleOpenPack}
            onOpenElementalPack={handleOpenElementalPack}
            loading={cardsLoading}
          />

          {/* Battle controls */}
          {selectedCards.length === 2 && !battleView && (
            <div style={{ marginTop: 24, padding: '18px 24px', background: 'var(--bg3)',
                          border: '1px solid var(--border)', borderRadius: 14,
                          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}
                 className="fade-in">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {selectedCards.map(c => (
                  <div key={c.id} style={{ textAlign: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%',
                                  background: `radial-gradient(circle, ${ABILITY_COLORS[c.abilityType ?? 0]}33, transparent)`,
                                  border: `2px solid ${ABILITY_COLORS[c.abilityType ?? 0]}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 22, margin: '0 auto 4px' }}>
                      {['🔥','❄️','⚡','☠️','🌀'][c.abilityType ?? 0]}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>#{c.id}</div>
                  </div>
                ))}
                <div style={{ fontSize: 22, color: 'var(--text-dim)', padding: '0 4px' }}>VS</div>
              </div>

              <button onClick={handleStartBattle} disabled={battleLoading}
                style={{ background: battleLoading ? 'var(--bg)' : 'linear-gradient(135deg, #cc2200, #ff4400)',
                         color: '#fff', border: 'none', borderRadius: 10,
                         padding: '12px 32px', cursor: battleLoading ? 'default' : 'pointer',
                         fontSize: 15, fontWeight: 700, letterSpacing: 1,
                         boxShadow: battleLoading ? 'none' : '0 0 20px #ff440066',
                         transition: 'all 0.2s' }}>
                {battleLoading ? '⏳ Ждём блокчейн...' : '⚔️ НАЧАТЬ БОЙ'}
              </button>

              <button onClick={() => setSelectedCards([])}
                style={{ background: 'transparent', color: 'var(--text-dim)',
                         border: '1px solid var(--border)', borderRadius: 8,
                         padding: '10px 18px', cursor: 'pointer', fontSize: 13 }}>
                Отмена
              </button>
            </div>
          )}

          {/* Battle arena */}
          {battleView && selectedCards.length === 2 && (
            <div style={{ marginTop: 28 }} className="fade-in">
              <button
                onClick={() => { setBattleView(false); setBattleResult(null); setSelectedCards([]); }}
                style={{ background: 'transparent', color: 'var(--text-dim)',
                         border: '1px solid var(--border)', borderRadius: 8,
                         padding: '8px 18px', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
                ← Назад к коллекции
              </button>
              <BattleArena
                challengerCard={selectedCards[0]}
                opponentCard={selectedCards[1]}
                battleResult={battleResult}
                onBattleEnd={() => { setBattleView(false); setBattleResult(null); setSelectedCards([]); }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
