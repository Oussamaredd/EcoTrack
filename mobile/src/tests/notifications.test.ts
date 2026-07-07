import Constants from "expo-constants";
import * as ExpoNotifications from "expo-notifications";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  extractNotificationRouteData,
  formatNotificationPermissionState,
} from "@/device/notifications";

describe("mobile notifications helpers", () => {
  const originalExecutionEnvironment = Constants.executionEnvironment;

  afterEach(() => {
    Constants.executionEnvironment = originalExecutionEnvironment;
  });

  it("extracts deep-link routing metadata from notification payloads", () => {
    expect(
      extractNotificationRouteData({
        notification: {
          request: {
            content: {
              data: {
                deepLink: "/(tabs)/history?notificationId=notif-1",
                notificationId: "notif-1",
              },
            },
          },
        },
      }),
    ).toEqual({
      deepLink: "/(tabs)/history?notificationId=notif-1",
      notificationId: "notif-1",
    });
  });

  it("formats non-granted permission states for the settings UI", () => {
    expect(formatNotificationPermissionState("development-build-required")).toContain(
      "development build",
    );
    expect(formatNotificationPermissionState("unsupported")).toBe("Unavailable on web");
  });

  it("does not attach native notification listeners in Expo Go", async () => {
    Constants.executionEnvironment = "storeClient" as typeof Constants.executionEnvironment;
    const receivedSpy = vi.spyOn(ExpoNotifications, "addNotificationReceivedListener");
    const responseSpy = vi.spyOn(ExpoNotifications, "addNotificationResponseReceivedListener");

    const receivedSubscription = await addNotificationReceivedListener(vi.fn());
    const responseSubscription = await addNotificationResponseListener(vi.fn());

    receivedSubscription.remove();
    responseSubscription.remove();
    expect(receivedSpy).not.toHaveBeenCalled();
    expect(responseSpy).not.toHaveBeenCalled();
  });
});
