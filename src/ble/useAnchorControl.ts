/**
 * Cycle démarrer/arrêter le mouillage — cahier-des-charges.md F-18 à F-20b,
 * architecture.md §4.2 et §5.3/§5.7. Orchestration uniquement : la logique
 * pure (phases, réessai) vient de `src/domain/anchorCommand.ts`, l'envoi
 * réel des commandes de `src/ble/client.ts` (via `BoardConnectionContext`).
 *
 * Aucune interface optimiste (F-20) : `phase` ne quitte jamais `sending`
 * ou `stopping` avant la réponse du BB ; l'écran affiche l'état actif
 * (`deviceStore.status.st`) uniquement une fois celui-ci mis à jour par
 * la trame `status` qui suit l'accusé de réception.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { hasNotificationPermission, requestNotificationPermission } from '@/src/alarm/notifications';
import {
  ANCHOR_START_RETRY_MS,
  acquiringReasonFor,
  type AcquiringReason,
  type AnchorCommandPhase,
} from '@/src/domain/anchorCommand';
import { useDeviceStore } from '@/src/store/deviceStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useBoardClient } from './BoardConnectionContext';
import { CommandRejectedError } from './client';

// F-38 : ne redemander qu'une fois par session tant que l'utilisateur n'a
// pas explicitement répondu (accepté, refusé, ou déjà décidé côté OS).
let notificationPermissionPrompted = false;

async function ensureNotificationPermissionExplained(t: (key: string) => string): Promise<void> {
  if (notificationPermissionPrompted) return;
  if (await hasNotificationPermission()) {
    notificationPermissionPrompted = true;
    return;
  }
  notificationPermissionPrompted = true;
  await new Promise<void>((resolve) => {
    Alert.alert(
      t('alarm.permission.title'),
      t('alarm.permission.message'),
      [
        { text: t('alarm.permission.later'), style: 'cancel', onPress: () => resolve() },
        {
          text: t('alarm.permission.allow'),
          onPress: () => {
            requestNotificationPermission().finally(resolve);
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve() }
    );
  });
}

export interface AnchorControl {
  phase: AnchorCommandPhase;
  /** Valeur en cours d'édition dans le popup de tolérance (F-19). */
  toleranceM: number;
  setToleranceM: (toleranceM: number) => void;
  /** Raison de l'attente pendant `phase === 'acquiring'` (F-20b). */
  acquiringReason: AcquiringReason | null;
  /** Clé de traduction `errors.*` du dernier échec à afficher, ou `null`. */
  errorKey: string | null;
  dismissError: () => void;
  /** Mouillage actif du point de vue du BB (F-18 : le bouton bascule sur ce seul critère). */
  isAnchored: boolean;
  openStartDialog: () => void;
  closeStartDialog: () => void;
  confirmStart: () => void;
  cancelAcquiring: () => void;
  requestStop: () => void;
  cancelStopConfirmation: () => void;
  confirmStop: () => void;
}

export function useAnchorControl(): AnchorControl {
  const { t } = useTranslation();
  const client = useBoardClient();
  const status = useDeviceStore((s) => s.status);
  const lastToleranceM = useSettingsStore((s) => s.lastToleranceM);
  const setLastToleranceM = useSettingsStore((s) => s.setLastToleranceM);

  const [phase, setPhase] = useState<AnchorCommandPhase>('idle');
  const [toleranceM, setToleranceM] = useState(lastToleranceM);
  const [acquiringReason, setAcquiringReason] = useState<AcquiringReason | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Évite de mettre à jour l'état après démontage (l'attente d'un fix peut durer longtemps).
  const unmounted = useRef(false);
  // Le réessai automatique (F-20b) rappelle la même fonction : on passe par une
  // ref pour éviter que `attemptStart` doive se référencer avant sa déclaration.
  const attemptStartRef = useRef<(tol: number) => void>(() => {});

  useEffect(
    () => () => {
      unmounted.current = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    []
  );

  const attemptStart = useCallback(
    (tol: number) => {
      setPhase('sending');
      setErrorKey(null);
      client.startAnchor(tol).then(
        () => {
          if (unmounted.current) return;
          // Pas d'affichage optimiste : `status.st` passera à "anchored" via
          // la trame `status` que le BB envoie juste après (architecture.md §4.2).
          setPhase('idle');
          setAcquiringReason(null);
        },
        (error: unknown) => {
          if (unmounted.current) return;
          if (error instanceof CommandRejectedError) {
            const reason = acquiringReasonFor(error.err);
            if (reason) {
              // F-20b : attente automatique, réessayée toutes les 5 s, annulable.
              setPhase('acquiring');
              setAcquiringReason(reason);
              retryTimer.current = setTimeout(() => attemptStartRef.current(tol), ANCHOR_START_RETRY_MS);
              return;
            }
            setPhase('idle');
            setErrorKey(`errors.${error.err}`);
            return;
          }
          // Délai d'attente épuisé (2 tentatives déjà faites par client.ts, §5.7) : échec, aucun état affiché (F-20).
          setPhase('idle');
          setErrorKey('errors.timeout');
        }
      );
    },
    [client]
  );
  useEffect(() => {
    attemptStartRef.current = attemptStart;
  }, [attemptStart]);

  const openStartDialog = useCallback(() => {
    setToleranceM(lastToleranceM);
    setPhase('settingTolerance');
  }, [lastToleranceM]);

  const closeStartDialog = useCallback(() => setPhase('idle'), []);

  const confirmStart = useCallback(() => {
    setLastToleranceM(toleranceM);
    // F-38 : la permission de notifications est demandée au moment où elle
    // devient utile (premier démarrage de mouillage), avec une explication ;
    // le mouillage démarre quoi qu'il arrive, dégradé si refusée (F-31 seul).
    void ensureNotificationPermissionExplained(t);
    attemptStart(toleranceM);
  }, [toleranceM, attemptStart, setLastToleranceM, t]);

  const cancelAcquiring = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    setAcquiringReason(null);
    setPhase('idle');
  }, []);

  const requestStop = useCallback(() => setPhase('confirmingStop'), []);
  const cancelStopConfirmation = useCallback(() => setPhase('idle'), []);

  const confirmStop = useCallback(() => {
    setPhase('stopping');
    setErrorKey(null);
    client.stopAnchor().then(
      () => {
        if (unmounted.current) return;
        setPhase('idle');
      },
      () => {
        if (unmounted.current) return;
        setPhase('idle');
        setErrorKey('errors.stopFailed');
      }
    );
  }, [client]);

  const dismissError = useCallback(() => setErrorKey(null), []);

  return {
    phase,
    toleranceM,
    setToleranceM,
    acquiringReason,
    errorKey,
    dismissError,
    isAnchored: status !== null && (status.st === 'anchored' || status.st === 'alarm'),
    openStartDialog,
    closeStartDialog,
    confirmStart,
    cancelAcquiring,
    requestStop,
    cancelStopConfirmation,
    confirmStop,
  };
}
