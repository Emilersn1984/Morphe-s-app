import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useBoardClient, useBoardScenario } from '@/src/ble/BoardConnectionContext';
import { SCENARIO_NAMES } from '@/src/ble/mock/scenarios';
import type { BoardEvent, StatusEvent } from '@/src/ble/protocol';
import { useDeviceStore } from '@/src/store/deviceStore';
import { COLORS, SIZES } from '@/src/ui/theme';

/** Tolérance de démonstration proposée par l'écran de dev (5–25 m, cahier-des-charges.md F-12). */
const DEV_TOLERANCE_M = 15;
const MAX_LOG_LINES = 30;

/**
 * Écran de développement — plan-de-developpement.md étape 1 :
 * « un écran de développement listant l'état simulé qui évolue en direct ».
 * N'a pas vocation à rester accessible depuis l'app finale (pas d'exigence
 * du cahier des charges) : c'est un outil de mise au point du contrat BLE.
 *
 * Pilote la **même** connexion que la Carte/les Réglages (`BoardConnectionContext`,
 * monté à la racine) : changer de scénario ici se voit donc immédiatement
 * sur l'écran Carte, plutôt que sur un deuxième boîtier simulé isolé.
 */
export default function DevScreen() {
  const { t } = useTranslation();
  const client = useBoardClient();
  const { scenario, setScenario } = useBoardScenario();
  const connectionState = useDeviceStore((s) => s.connectionState);
  const status = useDeviceStore((s) => s.status);
  const colors = COLORS[useColorScheme()];

  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribeEvents = client.onEvent((event) => {
      if (event.evt !== 'status') {
        appendLog(setLog, describeEvent(event));
      }
    });
    const unsubscribeInvalid = client.onInvalidFrame((reason) => {
      appendLog(setLog, t('dev.invalidFrame', { reason }));
    });
    return () => {
      unsubscribeEvents();
      unsubscribeInvalid();
    };
  }, [client, t]);

  return (
    <>
      <Stack.Screen options={{ title: t('dev.title') }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Section title={t('dev.scenario')}>
          <View style={styles.chipsRow}>
            {SCENARIO_NAMES.map((name) => (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityState={{ selected: scenario === name }}
                onPress={() => setScenario(name)}
                style={[
                  styles.chip,
                  {
                    borderColor: colors.accent,
                    backgroundColor: scenario === name ? colors.accent : 'transparent',
                  },
                ]}>
                <Text style={{ color: scenario === name ? colors.background : colors.text }}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title={t('dev.state')}>
          <Text style={{ color: colors.muted }}>{t(`dev.connection.${connectionState}`)}</Text>
          {status ? <StatusTable status={status} /> : <Text>{t('dev.noData')}</Text>}
        </Section>

        <Section title={t('dev.actions')}>
          <View style={styles.chipsRow}>
            <ActionButton label={t('dev.startAnchor', { tol: DEV_TOLERANCE_M })} onPress={() => void client.startAnchor(DEV_TOLERANCE_M)} />
            <ActionButton label={t('dev.stopAnchor')} onPress={() => void client.stopAnchor()} />
            <ActionButton label={t('dev.ackAlarm')} onPress={() => void client.ackAlarm()} />
            <ActionButton label={t('dev.testSms')} onPress={() => void client.testSms()} />
            <ActionButton label={t('dev.testAlarm')} onPress={() => void client.testAlarm(true)} />
          </View>
        </Section>

        <Section title={t('dev.log')}>
          {log.length === 0 ? (
            <Text>{t('dev.noData')}</Text>
          ) : (
            log.map((line, index) => (
              <Text key={`${index}-${line}`} style={styles.logLine}>
                {line}
              </Text>
            ))
          )}
        </Section>
      </ScrollView>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const colors = COLORS[colorScheme];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, { borderColor: colors.accent }]}>
      <Text style={{ color: colors.accent }}>{label}</Text>
    </Pressable>
  );
}

function StatusTable({ status }: { status: StatusEvent }) {
  const { t } = useTranslation();
  const rows: [string, string][] = [
    [t('dev.state'), status.st],
    [t('dev.tolerance'), `${status.tol} m`],
    [t('dev.drift'), `${status.drift.toFixed(1)} m`],
    [t('dev.dist'), `${status.dist.toFixed(1)} m`],
    [t('dev.out'), `${status.out}/5`],
    [t('dev.batteryBoard'), `${status.bat.bb}% ${status.bat.bbc ? '⚡' : ''}`],
    [t('dev.batteryTurret'), `${status.bat.tur}% ${status.bat.turc ? '⚡' : ''}`],
    [t('dev.gsm'), status.gsm.reg ? `${status.gsm.rssi} dBm` : '—'],
  ];

  return (
    <View>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function describeEvent(event: BoardEvent): string {
  switch (event.evt) {
    case 'alarm':
      return `alarm: ${event.reason} (drift=${event.drift.toFixed(1)}m, out=${event.out})`;
    case 'alarm_clear':
      return `alarm_clear: by=${event.by}`;
    case 'sms_result':
      return `sms_result: ok=${event.ok}${event.err ? ` err=${event.err}` : ''}`;
    case 'settings':
      return `settings: rf=${event.rf} vol=${event.vol}`;
    case 'log':
      return `log[${event.lvl}]: ${event.msg}`;
    default:
      return event.evt;
  }
}

function appendLog(setLog: (updater: (previous: string[]) => string[]) => void, line: string): void {
  setLog((previous) => [...previous.slice(-(MAX_LOG_LINES - 1)), line]);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SIZES.spacingPt,
    gap: SIZES.spacingPt,
  },
  section: {
    gap: SIZES.spacingPt / 2,
  },
  sectionTitle: {
    fontSize: SIZES.bodyFontSizePt,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.spacingPt / 2,
  },
  chip: {
    minHeight: SIZES.minTouchTargetPt,
    paddingHorizontal: SIZES.spacingPt / 2,
    borderRadius: SIZES.radiusPt,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowLabel: {
    fontWeight: '600',
  },
  rowValue: {
    fontVariant: ['tabular-nums'],
  },
  logLine: {
    fontSize: 12,
    fontFamily: 'SpaceMono',
  },
});
