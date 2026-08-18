/**
 * Son d'alarme en boucle, app au premier plan — cahier-des-charges.md F-31,
 * F-33 : volume indépendant de la sonnerie, non coupé par la mise en veille
 * de l'écran (architecture.md §2 : `expo-audio`, mode `playsInSilentMode`).
 */
import { useEffect } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

const ALARM_SOUND = require('@/assets/sounds/alarm.wav');

let audioModeConfigured = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
  });
}

/** Joue le son d'alarme en boucle tant que `active` est vrai (app au premier plan). */
export function useAlarmSoundLoop(active: boolean): void {
  const player = useAudioPlayer(ALARM_SOUND);

  useEffect(() => {
    void ensureAudioMode();
  }, []);

  // `AudioPlayer` (expo-audio) est un objet natif piloté impérativement (pas
  // un état React) : `.loop`/`.play()` sont l'API documentée, pas une mutation
  // interdite d'un état retourné par un hook.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    player.loop = true;
    if (active) {
      player.seekTo(0);
      player.play();
    } else {
      player.pause();
      player.seekTo(0);
    }
    return () => {
      player.pause();
    };
  }, [active, player]);
  /* eslint-enable react-hooks/immutability */
}
