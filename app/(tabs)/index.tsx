import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text, View } from '@/components/Themed';
import { useAnchorControl } from '@/src/ble/useAnchorControl';
import { anchorZoneColorKey } from '@/src/domain/anchorState';
import { initialBatteryAlarmState, updateBatteryAlarmState } from '@/src/domain/battery';
import { elapsedSince, elapsedTranslationKey } from '@/src/domain/staleness';
import { useDeviceStore } from '@/src/store/deviceStore';
import { Banner } from '@/src/ui/components/Banner';
import { BatteryBadge } from '@/src/ui/components/BatteryBadge';
import { DemoBanner } from '@/src/ui/components/DemoBanner';
import { InfoPanel } from '@/src/ui/components/InfoPanel';
import { LowBatteryDialog, type LowBatteryAlert } from '@/src/ui/components/LowBatteryDialog';
import { MooringMap } from '@/src/ui/components/MooringMap';
import { PrimaryButton } from '@/src/ui/components/PrimaryButton';
import { AcquiringDialog } from '@/src/ui/dialogs/AcquiringDialog';
import { ConfirmStopDialog } from '@/src/ui/dialogs/ConfirmStopDialog';
import { ToleranceDialog } from '@/src/ui/dialogs/ToleranceDialog';
import { SIZES } from '@/src/ui/theme';

/**
 * Écran 1 — Carte (accueil), construit à l'étape 2
 * (cahier-des-charges.md §4.2, plan-de-developpement.md étape 2).
 * Lit uniquement `deviceStore` (guidelines-de-developpement.md §3.3) : aucun
 * appel BLE direct depuis cet écran.
 */
export default function MapScreen() {
  const { t } = useTranslation();

  const connectionState = useDeviceStore((s) => s.connectionState);
  const status = useDeviceStore((s) => s.status);
  const statusReceivedAt = useDeviceStore((s) => s.statusReceivedAt);
  const anchorControl = useAnchorControl();

  const [alertQueue, setAlertQueue] = useState<LowBatteryAlert[]>([]);
  const [boardAlarmState, setBoardAlarmState] = useState(initialBatteryAlarmState);
  const [turretAlarmState, setTurretAlarmState] = useState(initialBatteryAlarmState);
  // Dernier couple de pourcentages déjà traité, pour détecter un nouveau
  // relevé sans dépendre d'un effet (F-17 : le déclenchement est une donnée
  // dérivée du rendu précédent, pas une synchronisation avec un système
  // externe — cf. https://react.dev/learn/you-might-not-need-an-effect).
  const [lastProcessedBat, setLastProcessedBat] = useState<{ bb: number; tur: number } | null>(null);

  if (status && (lastProcessedBat === null || lastProcessedBat.bb !== status.bat.bb || lastProcessedBat.tur !== status.bat.tur)) {
    const boardUpdate = updateBatteryAlarmState(boardAlarmState, status.bat.bb);
    const turretUpdate = updateBatteryAlarmState(turretAlarmState, status.bat.tur);

    const newAlerts: LowBatteryAlert[] = [];
    if (boardUpdate.triggered) newAlerts.push({ element: 'board', threshold: boardUpdate.triggered });
    if (turretUpdate.triggered) newAlerts.push({ element: 'turret', threshold: turretUpdate.triggered });

    setBoardAlarmState(boardUpdate.state);
    setTurretAlarmState(turretUpdate.state);
    setLastProcessedBat({ bb: status.bat.bb, tur: status.bat.tur });
    if (newAlerts.length > 0) {
      setAlertQueue((previous) => [...previous, ...newAlerts]);
    }
  }

  // F-05 : horloge locale pour rafraîchir l'âge affiché quand la liaison est coupée.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (connectionState === 'connected') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [connectionState]);

  if (!status) {
    return (
      <View style={styles.centered}>
        <Text style={styles.placeholder}>{t(`dev.connection.${connectionState}`)}</Text>
      </View>
    );
  }

  const stale = connectionState !== 'connected';
  const elapsedSeconds = statusReceivedAt ? (now - statusReceivedAt) / 1000 : 0;
  const elapsed = elapsedSince(elapsedSeconds);
  const anchorKnown = status.anc.valid && status.ref.valid;
  const zoneColorKey = anchorZoneColorKey(status.st, status.out);
  const boat = { lat: status.boat.lat, lon: status.boat.lon };
  const anchor = anchorKnown ? { lat: status.anc.lat, lon: status.anc.lon } : null;
  const reference = anchorKnown ? { lat: status.ref.lat, lon: status.ref.lon } : boat;

  return (
    <View style={styles.container}>
      <DemoBanner />

      <View style={styles.mapContainer}>
        <MooringMap reference={reference} boat={boat} anchor={anchor} toleranceM={status.tol} zoneColorKey={zoneColorKey} />
        <View style={styles.batteryRow}>
          <BatteryBadge
            batteryPct={status.bat.bb}
            charging={status.bat.bbc}
            accessibilityLabel={t('map.batteryBoardLabel', { pct: Math.round(status.bat.bb) })}
          />
          <BatteryBadge
            batteryPct={status.bat.tur}
            charging={status.bat.turc ?? false}
            accessibilityLabel={t('map.batteryTurretLabel', { pct: Math.round(status.bat.tur) })}
          />
        </View>
      </View>

      {stale && statusReceivedAt ? (
        <Banner message={t('map.staleData', { elapsed: t(elapsedTranslationKey(elapsed.unit), { count: elapsed.count }) })} />
      ) : null}

      {!anchorKnown ? <Banner message={t('map.unknownAnchor')} /> : null}

      {anchorControl.errorKey ? <Banner message={t(anchorControl.errorKey)} /> : null}

      <InfoPanel status={status} stale={stale} />

      <PrimaryButton
        label={anchorControl.isAnchored ? t('anchor.stopButton') : t('anchor.startButton')}
        onPress={anchorControl.isAnchored ? anchorControl.requestStop : anchorControl.openStartDialog}
        danger={anchorControl.isAnchored}
        disabled={connectionState !== 'connected'}
        loading={anchorControl.phase === 'sending' || anchorControl.phase === 'stopping'}
      />

      <LowBatteryDialog alert={alertQueue[0] ?? null} onDismiss={() => setAlertQueue((previous) => previous.slice(1))} />

      <ToleranceDialog
        visible={anchorControl.phase === 'settingTolerance'}
        toleranceM={anchorControl.toleranceM}
        onChangeTolerance={anchorControl.setToleranceM}
        onConfirm={anchorControl.confirmStart}
        onCancel={anchorControl.closeStartDialog}
      />

      <AcquiringDialog
        visible={anchorControl.phase === 'acquiring'}
        reason={anchorControl.acquiringReason}
        onCancel={anchorControl.cancelAcquiring}
      />

      <ConfirmStopDialog
        visible={anchorControl.phase === 'confirmingStop'}
        onConfirm={anchorControl.confirmStop}
        onCancel={anchorControl.cancelStopConfirmation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.spacingPt,
  },
  placeholder: {
    fontSize: SIZES.bodyFontSizePt,
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  batteryRow: {
    position: 'absolute',
    top: SIZES.spacingPt / 2,
    right: SIZES.spacingPt / 2,
    flexDirection: 'row',
    gap: SIZES.spacingPt / 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: SIZES.radiusPt,
    padding: 6,
  },
});
