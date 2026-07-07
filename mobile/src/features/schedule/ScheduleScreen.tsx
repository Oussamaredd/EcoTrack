import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { Button, HelperText, ProgressBar, Text } from "react-native-paper";

import { containersApi } from "@api/modules/containers";
import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { demoCitizenContainers } from "@/lib/demoCitizenData";
import { queryKeys } from "@/lib/queryKeys";
import { useNotificationController } from "@/providers/NotificationProvider";
import type { AppTheme } from "@/theme/theme";
import { useThemedStyles } from "@/theme/useAppTheme";

const normalizeFill = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(Math.max(Math.round(value), 0), 100);
};

const createStyles = (theme: AppTheme) =>
  ({
    stack: {
      gap: theme.spacing.md
    },
    reminderPanel: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.shape.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surfaceMuted
    },
    reminderHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm
    },
    title: {
      color: theme.colors.onSurface,
      fontWeight: "700"
    },
    meta: {
      color: theme.colors.textMuted,
      lineHeight: 20
    },
    badge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.shape.pill,
      backgroundColor: theme.colors.primarySurface
    },
    badgeText: {
      color: theme.colors.primaryStrong,
      fontWeight: "700"
    },
    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    },
    actionButton: {
      flexGrow: 1
    },
    serviceItem: {
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSoft
    },
    serviceHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md
    },
    progress: {
      height: 8,
      borderRadius: theme.shape.pill
    }
  }) satisfies Record<string, object>;

export function ScheduleScreen() {
  const styles = useThemedStyles(createStyles);
  const {
    registrationError,
    registrationState,
    requestRegistration
  } = useNotificationController();
  const containersQuery = useQuery({
    queryKey: queryKeys.containers("all"),
    queryFn: () => containersApi.list({ pageSize: 6 })
  });

  const liveContainers = containersQuery.data?.containers ?? [];
  const containers = liveContainers.length > 0 ? liveContainers : demoCitizenContainers.slice(0, 6);
  const reminderLabel =
    registrationState === "registered"
      ? "On"
      : registrationState === "registering"
        ? "Enabling"
        : "Off";

  return (
    <ScreenContainer
      eyebrow="Schedule"
      title="Schedule"
      description="Reminders and nearby service."
    >
      <InfoCard title="Collection reminders" icon="bell-outline">
        <View style={styles.reminderPanel}>
          <View style={styles.reminderHeader}>
            <View>
              <Text variant="titleMedium" style={styles.title}>
                Report updates
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                Get notified when a report changes status.
              </Text>
            </View>
            <View style={styles.badge}>
              <Text variant="labelLarge" style={styles.badgeText}>
                {reminderLabel}
              </Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <Button
              mode={registrationState === "registered" ? "outlined" : "contained"}
              icon="bell-plus-outline"
              style={styles.actionButton}
              loading={registrationState === "registering"}
              disabled={registrationState === "registering"}
              onPress={() => {
                void requestRegistration();
              }}
            >
              {registrationState === "registered" ? "Reminders enabled" : "Enable reminders"}
            </Button>
          </View>
          {registrationError ? (
            <HelperText type="error" visible>
              {registrationError}
            </HelperText>
          ) : null}
        </View>
      </InfoCard>

      <InfoCard
        title="Nearby service"
        icon="map-marker-radius-outline"
        caption="Containers around your current service area."
      >
        {containers.length > 0 ? (
          <View style={styles.stack}>
            {containers.map((container) => {
              const fill = normalizeFill(container.fillLevelPercent);

              return (
                <View key={container.id} style={styles.serviceItem}>
                  <View style={styles.serviceHeader}>
                    <View>
                      <Text variant="titleMedium" style={styles.title}>
                        {container.code}
                      </Text>
                      <Text variant="bodySmall" style={styles.meta}>
                        {container.label}
                      </Text>
                    </View>
                    <Text variant="labelLarge" style={styles.badgeText}>
                      {fill == null ? "No fill" : `${fill}%`}
                    </Text>
                  </View>
                  {fill == null ? null : (
                    <ProgressBar progress={fill / 100} style={styles.progress} />
                  )}
                </View>
              );
            })}
          </View>
        ) : null}
      </InfoCard>
    </ScreenContainer>
  );
}
