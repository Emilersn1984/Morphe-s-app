/**
 * Les 9 scénarios du boîtier simulé — architecture.md §10.
 *
 * Chacun ne modifie qu'un aspect du comportement nominal, pour rester
 * facile à vérifier et à combiner mentalement avec le contrat §5.
 */
export const SCENARIO_NAMES = [
  'nominal',
  'derapage',
  'batterie_faible_bb',
  'batterie_faible_tourelle',
  'en_charge',
  'sans_fix_gps',
  'tourelle_perdue',
  'liaison_instable',
  'firmware_incompatible',
] as const;

export type ScenarioName = (typeof SCENARIO_NAMES)[number];

export interface ScenarioConfig {
  /** La tourelle s'éloigne progressivement de la référence une fois le mouillage démarré. */
  drag?: boolean;
  /** Vitesse de décharge de la batterie du BB, en points de %/tick. */
  bbDrainPctPerTick?: number;
  /** Vitesse de décharge de la batterie de la tourelle, en points de %/tick. */
  turDrainPctPerTick?: number;
  /** BB et tourelle en charge (batteries qui remontent, éclair affiché). */
  charging?: boolean;
  /** Pas de position GPS valide côté BB : `anchor_start` échoue en `ERR_NO_FIX`. */
  noFix?: boolean;
  /** Tourelle muette : `anchor_start` échoue en `ERR_NO_TURRET`, `anc.valid=false`. */
  turretLost?: boolean;
  /** Une partie des notifications de statut est perdue ou corrompue (liaison faible). */
  unstableLink?: boolean;
  /** Le `hello` répond avec un `proto` que l'app ne connaît pas. */
  helloProtoMismatch?: boolean;
}

export const SCENARIOS: Record<ScenarioName, ScenarioConfig> = {
  nominal: {},
  derapage: { drag: true },
  batterie_faible_bb: { bbDrainPctPerTick: 3 },
  batterie_faible_tourelle: { turDrainPctPerTick: 3 },
  en_charge: { charging: true },
  sans_fix_gps: { noFix: true },
  tourelle_perdue: { turretLost: true },
  liaison_instable: { unstableLink: true },
  firmware_incompatible: { helloProtoMismatch: true },
};
