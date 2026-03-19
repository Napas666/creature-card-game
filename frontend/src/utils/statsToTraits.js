// Normalize raw on-chain stats (uint8, 1–100) to [0, 1]
export function normalize(value) {
  return (Number(value) - 1) / 99;
}

const ABILITY_THEMES = {
  0: { name: 'FIRE',      primary: 0xff3300, secondary: 0xff9900, emissive: 0xff2200, particle: 'ember'  },
  1: { name: 'ICE',       primary: 0x88ccff, secondary: 0xeeffff, emissive: 0x0088cc, particle: 'frost'  },
  2: { name: 'LIGHTNING', primary: 0xffff00, secondary: 0xaaaaff, emissive: 0x8800ff, particle: 'spark'  },
  3: { name: 'POISON',    primary: 0x44ff44, secondary: 0x003300, emissive: 0x00cc00, particle: 'bubble' },
  4: { name: 'VOID',      primary: 0x220033, secondary: 0xcc00ff, emissive: 0x9900ff, particle: 'rift'   },
};

export function getAbilityTheme(abilityTypeIndex) {
  return ABILITY_THEMES[Number(abilityTypeIndex)] ?? ABILITY_THEMES[0];
}

export function statsToTraits(cardStats) {
  return {
    atk:   normalize(cardStats.attack),
    hp:    normalize(cardStats.health),
    spd:   normalize(cardStats.speed),
    theme: getAbilityTheme(cardStats.abilityType),
  };
}
