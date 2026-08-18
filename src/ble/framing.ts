/**
 * Découpage/réassemblage des trames — architecture.md §5.2 et §4.1.
 *
 * Les paquets BLE arrivent fragmentés (MTU souvent < 180 octets) ; chaque
 * côté doit réassembler jusqu'au `\n`. Cette classe ne connaît rien du
 * protocole JSON : elle rend juste des lignes complètes à `protocol.ts`.
 */
import { MAX_MESSAGE_BYTES } from './protocol';

// Marge de sécurité : une ligne ne devrait jamais dépasser MAX_MESSAGE_BYTES + le "\n",
// mais on tolère un tampon plus large avant de le considérer corrompu/abandonné,
// pour ne jamais accumuler indéfiniment de mémoire sur un flux défaillant.
const MAX_BUFFER_BYTES = MAX_MESSAGE_BYTES * 4;

export class FrameAssembler {
  private buffer = '';

  /**
   * Ajoute un fragment reçu du transport BLE et renvoie les lignes complètes
   * (sans le `\n` final) qui peuvent maintenant être décodées.
   */
  push(chunk: string): string[] {
    this.buffer += chunk;

    if (this.buffer.length > MAX_BUFFER_BYTES && !this.buffer.includes('\n')) {
      // Flux visiblement corrompu (jamais de fin de ligne) : on abandonne le
      // tampon plutôt que de grossir indéfiniment. La trame sera perdue mais
      // journalisée par l'appelant.
      this.buffer = '';
      return [];
    }

    const lines: string[] = [];
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      lines.push(this.buffer.slice(0, newlineIndex));
      this.buffer = this.buffer.slice(newlineIndex + 1);
      newlineIndex = this.buffer.indexOf('\n');
    }
    return lines;
  }

  /** Vide le tampon (reconnexion, changement de boîtier, etc.). */
  reset(): void {
    this.buffer = '';
  }

  /** Utilisé par les tests / diagnostics : contenu non terminé en attente. */
  get pendingBuffer(): string {
    return this.buffer;
  }
}
