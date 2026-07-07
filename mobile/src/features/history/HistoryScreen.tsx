import { useEffect, useMemo, useState } from "react";
import { Image, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Text } from "react-native-paper";

import { citizenApi } from "@api/modules/citizen";
import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { demoCitizenHistory } from "@/lib/demoCitizenData";
import {
  formatCitizenReportTypeLabel,
  formatRelativeReportTime
} from "@/lib/citizenReports";
import { formatCoordinates, formatDateTime } from "@/lib/formatters";
import { queryKeys } from "@/lib/queryKeys";
import { useNotificationController } from "@/providers/NotificationProvider";
import type { AppTheme } from "@/theme/theme";
import { useThemedStyles } from "@/theme/useAppTheme";

const HISTORY_BATCH_SIZE = 10;

const createStyles = (theme: AppTheme) =>
  ({
    timelineList: {
      gap: theme.spacing.md
    },
    timelineCard: {
      gap: theme.spacing.sm,
      paddingLeft: theme.spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary
    },
    timelineHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm
    },
    timelineTitle: {
      flex: 1,
      color: theme.colors.onSurface,
      fontWeight: "700"
    },
    timelineMeta: {
      color: theme.colors.textMuted,
      lineHeight: 20
    },
    timelineStatus: {
      alignSelf: "flex-start",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.shape.pill,
      backgroundColor: theme.colors.primarySurface
    },
    timelineStatusText: {
      color: theme.colors.primaryStrong,
      fontWeight: "700"
    },
    photoEvidence: {
      width: "100%",
      height: 180,
      borderRadius: theme.shape.md
    },
    footerActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    },
    footerButton: {
      flexGrow: 1
    }
  }) satisfies Record<string, object>;

export function HistoryScreen() {
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ notificationId?: string }>();
  const { markNotificationRead } = useNotificationController();
  const [visibleCount, setVisibleCount] = useState(HISTORY_BATCH_SIZE);
  const [scrollToTopSignal, setScrollToTopSignal] = useState(0);
  const historyQuery = useQuery({
    queryKey: queryKeys.citizenHistory(1, 50),
    queryFn: () => citizenApi.getHistory(1, 50)
  });

  useEffect(() => {
    if (typeof params.notificationId !== "string" || params.notificationId.length === 0) {
      return;
    }

    void markNotificationRead(params.notificationId);
  }, [markNotificationRead, params.notificationId]);

  const history = useMemo(() => {
    const liveHistory = historyQuery.data?.history ?? [];

    return liveHistory.length > 0 ? liveHistory : demoCitizenHistory;
  }, [historyQuery.data?.history]);
  const visibleHistory = history.slice(0, visibleCount);
  const hasMoreHistory = visibleCount < history.length;

  const loadMoreHistory = () => {
    if (!hasMoreHistory) {
      return;
    }

    setVisibleCount((currentValue) =>
      Math.min(currentValue + HISTORY_BATCH_SIZE, history.length)
    );
  };

  return (
    <ScreenContainer
      eyebrow="History"
      title="History"
      description="Reports and status."
      onEndReached={loadMoreHistory}
      scrollToTopSignal={scrollToTopSignal}
    >
      {typeof params.notificationId === "string" && params.notificationId.length > 0 ? (
        <InfoCard title="Opened from notification">
          <Text variant="bodyMedium">
            EcoTrack opened your report history from a notification.
          </Text>
        </InfoCard>
      ) : null}

      <InfoCard title="History" icon="timeline-text-outline">
        <View style={styles.timelineList}>
          {visibleHistory.map((item) => (
            <View key={item.id} style={styles.timelineCard}>
              <View style={styles.timelineHeader}>
                <Text variant="titleMedium" style={styles.timelineTitle}>
                  {item.containerCode ?? "Container"}
                  {item.containerLabel ? ` - ${item.containerLabel}` : ""}
                </Text>
                <Text variant="bodySmall" style={styles.timelineMeta}>
                  {formatRelativeReportTime(item.reportedAt)}
                </Text>
              </View>
              <View style={styles.timelineStatus}>
                <Text variant="labelLarge" style={styles.timelineStatusText}>
                  {formatCitizenReportTypeLabel(item.reportType)} | {item.status}
                </Text>
              </View>
              <Text variant="bodyMedium">{item.description}</Text>
              <Text variant="bodySmall" style={styles.timelineMeta}>
                Reported: {formatDateTime(item.reportedAt)}
              </Text>
              <Text variant="bodySmall" style={styles.timelineMeta}>
                Location: {formatCoordinates(item.latitude, item.longitude)}
              </Text>
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.photoEvidence} resizeMode="cover" />
              ) : null}
            </View>
          ))}
        </View>
      </InfoCard>

      <View style={styles.footerActions}>
        <Button
          mode="outlined"
          icon="arrow-up"
          style={styles.footerButton}
          onPress={() => setScrollToTopSignal((currentValue) => currentValue + 1)}
        >
          Back to top
        </Button>
      </View>
    </ScreenContainer>
  );
}
