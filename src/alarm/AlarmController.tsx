/**
 * Orchestrateur unique de l'alarme et de la liaison perdue —
 * cahier-des-charges.md F-30 à F-38. Monté une fois (layout des onglets),
 * ne lit que `deviceStore`/`alarmStore` (guidelines-de-developpement.md
 * §3.3) : combine son + vibration + notifications + popup selon que l'app
 * est au premier plan ou non, sans jamais décider l'alarme elle-même.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState, Vibration } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useBoardClient } from '@/src/ble/BoardConnectionContext';
import { isAlarmVisible, isLinkLost, isMonitoringActive } from '@/src/domain/alarm';
import { useAlarmStore } from '@/src/store/alarmStore';
import { useDeviceStore } from '@/src/store/deviceStore';
import { AlarmDialog } from '@/src/ui/dialogs/AlarmDialog';
import {
  cancelAlarmNotification,
  scheduleAlarmNotification,
  sendLinkLostNotification,
} from './notifications';
import { useAlarmSoundLoop } from './sound';

/** Motif de vibration continue tant que l'alarme n'est pas acquittée — F-31. */
const VIBRATION_PATTERN = [0, 500, 250, 500];

export function AlarmController() {
  const { t } = useTranslation();
  const client = useBoardClient();

  const activeAlarm = useDeviceStore((s) => s.activeAlarm);
  const boardState = useDeviceStore((s) => s.status?.st ?? null);
  const connectionState = useDeviceStore((s) => s.connectionState);
  const acknowledgedTs = useAlarmStore((s) => s.acknowledgedTs);
  const acknowledge = useAlarmStore((s) => s.acknowledge);

  const [appForeground, setAppForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setAppForeground(state === 'active'));
    return () => subscription.remove();
  }, []);

  const visible = isAlarmVisible(activeAlarm?.ts ?? null, acknowledgedTs);

  useAlarmSoundLoop(visible && appForeground);
  useEffect(() => {
    if (visible && appForeground) {
      Vibration.vibrate(VIBRATION_PATTERN, true);
    } else {
      Vibration.cancel();
    }
    return () => Vibration.cancel();
  }, [visible, appForeground]);

  // F-32 : notification répétée uniquement quand l'app n'est pas au premier
  // plan (sinon la popup + le son du premier plan suffisent).
  useEffect(() => {
    if (visible && !appForeground && activeAlarm) {
      void scheduleAlarmNotification(
        t(`alarm.notification.title.${activeAlarm.reason}`),
        t('alarm.notification.body', { value: activeAlarm.drift })
      );
    } else {
      void cancelAlarmNotification();
    }
  }, [visible, appForeground, activeAlarm, t]);

  const ack = () => {
    if (!activeAlarm) return;
    acknowledge(activeAlarm.ts);
    // F-34 : acquittement local immédiat (F-36 : persiste même si la
    // liaison tombe) ; la demande d'arrêt de sirène au BB est best-effort.
    client.ackAlarm().catch(() => {});
  };

  // F-37 : liaison perdue > 2 min pendant un mouillage actif seulement.
  const disconnectedSinceRef = useRef<number | null>(null);
  const linkLostNotifiedRef = useRef(false);
  useEffect(() => {
    if (connectionState === 'connected') {
      disconnectedSinceRef.current = null;
      linkLostNotifiedRef.current = false;
      return;
    }
    if (!isMonitoringActive(boardState)) return;
    if (disconnectedSinceRef.current === null) {
      disconnectedSinceRef.current = Date.now();
    }
    const timer = setInterval(() => {
      if (linkLostNotifiedRef.current) return;
      if (isLinkLost(disconnectedSinceRef.current, Date.now())) {
        linkLostNotifiedRef.current = true;
        void sendLinkLostNotification(t('alarm.linkLost.title'), t('alarm.linkLost.body'));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [connectionState, boardState, t]);

  return <AlarmDialog visible={visible} alarm={activeAlarm} onAcknowledge={ack} />;
}
