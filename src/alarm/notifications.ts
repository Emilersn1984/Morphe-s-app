/**
 * Notifications locales de l'alarme — cahier-des-charges.md F-32, F-37, F-38.
 * Utilisées uniquement quand l'app n'est pas au premier plan : la boucle
 * sonore + vibration de `sound.ts` couvre le cas app ouverte (F-31/F-33).
 * Aucun serveur, aucun push : uniquement des notifications programmées
 * localement (architecture.md §2, §6.1).
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/** Fichier embarqué via le plugin `expo-notifications` (voir app.json). */
const ALARM_SOUND_FILE = 'alarm.wav';

const ANDROID_ALARM_CHANNEL_ID = 'anchor-alarm';
const ANDROID_LINK_LOST_CHANNEL_ID = 'link-lost';

/** Identifiant fixe : permet d'annuler/remplacer la notification en cours (F-32). */
const ALARM_NOTIFICATION_ID = 'anchor-alarm-notification';

/** `expo-notifications` ne supporte que Android/iOS (architecture.md §2) : no-op sur le web. */
const SUPPORTED = Platform.OS === 'android' || Platform.OS === 'ios';

/**
 * Une notification programmée doit s'afficher même quand l'app est au
 * premier plan (l'utilisateur peut avoir quitté l'écran Carte), sans
 * dupliquer le son déjà joué par `sound.ts` dans ce cas.
 */
if (SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

let androidChannelsReady = false;

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android' || androidChannelsReady) return;
  await Notifications.setNotificationChannelAsync(ANDROID_ALARM_CHANNEL_ID, {
    name: 'Alarme de mouillage',
    importance: Notifications.AndroidImportance.MAX,
    sound: ALARM_SOUND_FILE,
    vibrationPattern: [0, 500, 250, 500],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false, // F-32/D6 : respecte le mode « Ne pas déranger », voir cahier-des-charges.md §6.4.
  });
  await Notifications.setNotificationChannelAsync(ANDROID_LINK_LOST_CHANNEL_ID, {
    name: 'Liaison boîtier perdue',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250],
  });
  androidChannelsReady = true;
}

/** Vrai si l'app peut déjà notifier, sans solliciter l'utilisateur. */
export async function hasNotificationPermission(): Promise<boolean> {
  if (!SUPPORTED) return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Demande la permission de notifications — F-38 : appelée au premier
 * démarrage de mouillage, jamais avant. L'explication est affichée par
 * l'appelant (popup dédié) avant cet appel natif.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!SUPPORTED) return false;
  await ensureAndroidChannels();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

/**
 * Programme la notification d'alarme répétée jusqu'à acquittement (F-32).
 * Sur iOS, un déclencheur répétitif ne peut pas descendre sous 60 s : c'est
 * la boucle sonore au premier plan qui assure la réactivité immédiate
 * (F-31), cette notification couvre le cas app en arrière-plan/verrouillée.
 */
export async function scheduleAlarmNotification(title: string, body: string): Promise<void> {
  if (!SUPPORTED) return;
  await ensureAndroidChannels();
  await Notifications.cancelScheduledNotificationAsync(ALARM_NOTIFICATION_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: ALARM_NOTIFICATION_ID,
    content: {
      title,
      body,
      sound: ALARM_SOUND_FILE,
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_ALARM_CHANNEL_ID } : {}),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 60, repeats: true },
  });
}

/** Annule la notification d'alarme en cours — appelée dès l'acquittement (F-34). */
export async function cancelAlarmNotification(): Promise<void> {
  if (!SUPPORTED) return;
  await Notifications.cancelScheduledNotificationAsync(ALARM_NOTIFICATION_ID).catch(() => {});
  await Notifications.dismissNotificationAsync(ALARM_NOTIFICATION_ID).catch(() => {});
}

/** Notification unique, non répétée, distincte de l'alarme de dérapage — F-37. */
export async function sendLinkLostNotification(title: string, body: string): Promise<void> {
  if (!SUPPORTED) return;
  await ensureAndroidChannels();
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_LINK_LOST_CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}
