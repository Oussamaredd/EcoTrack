import { describe, expect, it } from "vitest";

import {
  extractNotificationRouteData,
  formatNotificationPermissionState,
} from "@/device/notifications";

describe("mobile notifications helpers", () => {
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
});
