export const AndroidImportance = {
  DEFAULT: 3,
};

export const setNotificationHandler = () => undefined;
export const getPermissionsAsync = async () => ({ status: "granted" });
export const requestPermissionsAsync = async () => ({ status: "granted" });
export const setNotificationChannelAsync = async () => undefined;
export const getExpoPushTokenAsync = async () => ({ data: "ExponentPushToken[test]" });
export const addNotificationReceivedListener = (listener: (notification: unknown) => void) => ({
  remove: () => {
    void listener;
  },
});
export const addNotificationResponseReceivedListener = (
  listener: (response: unknown) => void
) => ({
  remove: () => {
    void listener;
  },
});
export const getLastNotificationResponseAsync = async () => null;

