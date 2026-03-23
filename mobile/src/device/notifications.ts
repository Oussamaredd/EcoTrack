import Constants from "expo-constants";
import { Platform } from "react-native";

export type NotificationPermissionState =
  | "granted"
  | "denied"
  | "undetermined"
  | "development-build-required"
  | "unsupported";

export type NotificationRegistrationResult =
  | {
      permissionState: "granted";
      provider: "expo";
      platform: "ios" | "android";
      pushToken: string;
    }
  | {
      permissionState:
        | "denied"
        | "undetermined"
        | "development-build-required"
        | "unsupported";
      reason: string;
    };

type NotificationModule = typeof import("expo-notifications");

const loadNotificationsModule = async (): Promise<NotificationModule> => import("expo-notifications");

const resolveProjectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId ??
  Constants.easConfig?.projectId ??
  undefined;

export const configureNotificationPresentation = async () => {
  if (Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return;
  }

  const notifications = await loadNotificationsModule();
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

export const getNotificationPermissionState = async (): Promise<NotificationPermissionState> => {
  if (Platform.OS === "web") {
    return "unsupported";
  }

  if (Constants.executionEnvironment === "storeClient") {
    return "development-build-required";
  }

  const notifications = await loadNotificationsModule();
  const settings = await notifications.getPermissionsAsync();
  return settings.status as NotificationPermissionState;
};

export const requestNotificationPermissionState = async (): Promise<NotificationPermissionState> => {
  if (Platform.OS === "web") {
    return "unsupported";
  }

  if (Constants.executionEnvironment === "storeClient") {
    return "development-build-required";
  }

  const notifications = await loadNotificationsModule();
  const settings = await notifications.requestPermissionsAsync();
  return settings.status as NotificationPermissionState;
};

export const registerForPushNotifications = async (): Promise<NotificationRegistrationResult> => {
  if (Platform.OS === "web") {
    return {
      permissionState: "unsupported",
      reason: "Notifications are unavailable on web."
    };
  }

  if (Constants.executionEnvironment === "storeClient") {
    return {
      permissionState: "development-build-required",
      reason: "Expo Go cannot receive remote push notifications."
    };
  }

  const notifications = await loadNotificationsModule();

  if (Platform.OS === "android") {
    await notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2F6DF8",
    });
  }

  let permissionState = await getNotificationPermissionState();
  if (permissionState !== "granted") {
    permissionState = await requestNotificationPermissionState();
  }

  if (permissionState !== "granted") {
    return {
      permissionState,
      reason: formatNotificationPermissionState(permissionState)
    };
  }

  const tokenResponse = await notifications.getExpoPushTokenAsync({
    ...(resolveProjectId() ? { projectId: resolveProjectId() } : {})
  });

  return {
    permissionState: "granted",
    provider: "expo",
    platform: Platform.OS === "ios" ? "ios" : "android",
    pushToken: tokenResponse.data
  };
};

export const addNotificationReceivedListener = async (
  listener: (notification: any) => void
) => {
  const notifications = await loadNotificationsModule();
  return notifications.addNotificationReceivedListener(listener);
};

export const addNotificationResponseListener = async (
  listener: (response: any) => void
) => {
  const notifications = await loadNotificationsModule();
  return notifications.addNotificationResponseReceivedListener(listener);
};

export const getLastNotificationResponse = async () => {
  if (Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return null;
  }

  const notifications = await loadNotificationsModule();
  return notifications.getLastNotificationResponseAsync();
};

export const extractNotificationRouteData = (
  response:
    | Awaited<ReturnType<typeof getLastNotificationResponse>>
    | { notification?: { request?: { content?: { data?: Record<string, unknown> } } } }
    | null
) => {
  const data = response?.notification?.request?.content?.data;
  if (!data || typeof data !== "object") {
    return {
      deepLink: null,
      notificationId: null,
    };
  }

  return {
    deepLink: typeof data.deepLink === "string" ? data.deepLink : null,
    notificationId: typeof data.notificationId === "string" ? data.notificationId : null,
  };
};

export const formatNotificationPermissionState = (
  state?: NotificationPermissionState | null
) => {
  switch (state) {
    case "granted":
      return "Granted";
    case "denied":
      return "Denied";
    case "undetermined":
      return "Not requested yet";
    case "development-build-required":
      return "Expo Go cannot test remote push. Use a development build.";
    case "unsupported":
      return "Unavailable on web";
    default:
      return "Unknown";
  }
};
