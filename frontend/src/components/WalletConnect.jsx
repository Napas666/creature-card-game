export function WalletConnect({ address, chainId, error, onConnect }) {
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {address ? (
        <>
          <div style={{
            background: '#1a2a1a',
            border:     '1px solid #2a4a2a',
            borderRadius: 8,
            padding:    '6px 14px',
            color:      '#44ff88',
            fontSize:   13,
          }}>
            {short}
          </div>
          <div style={{ color: '#556', fontSize: 12 }}>
            Chain {chainId}
          </div>
        </>
      ) : (
        <button
          onClick={onConnect}
          style={{
            background:   '#2244aa',
            color:        '#fff',
            border:       'none',
            borderRadius: 8,
            padding:      '8px 20px',
            cursor:       'pointer',
            fontSize:     14,
            fontWeight:   600,
          }}
        >
          🦊 Подключить MetaMask
        </button>
      )}
      {error && <span style={{ color: '#f44', fontSize: 12 }}>{error}</span>}
    </div>
  );
}
