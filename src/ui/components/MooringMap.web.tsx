/**
 * Variante web de `MooringMap` — architecture.md §2.1 : le fond de carte
 * natif (Apple/Google Maps) n'existe que sur iOS/Android (N-10). Le web
 * n'est utilisé qu'en aperçu de développement ; on y réutilise la vue
 * schématique de repli (N-12), qui affiche la même géométrie exacte.
 */
import { SchematicMooringView, type SchematicMooringViewProps } from './SchematicMooringView';

export type MooringMapProps = SchematicMooringViewProps;

export function MooringMap(props: MooringMapProps) {
  return <SchematicMooringView {...props} />;
}
