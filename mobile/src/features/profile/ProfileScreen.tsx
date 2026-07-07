import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { Text } from "react-native-paper";

import { citizenApi } from "@api/modules/citizen";
import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { demoCitizenProfile } from "@/lib/demoCitizenData";
import { queryKeys } from "@/lib/queryKeys";
import type { AppTheme } from "@/theme/theme";
import { useThemedStyles } from "@/theme/useAppTheme";

const createStyles = (theme: AppTheme) =>
  ({
    identityStack: {
      gap: theme.spacing.xs
    },
    muted: {
      color: theme.colors.textMuted,
      lineHeight: 20
    },
    metricRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    },
    metricItem: {
      flexGrow: 1,
      minWidth: 118,
      padding: theme.spacing.md,
      borderRadius: theme.shape.md,
      backgroundColor: theme.colors.surfaceMuted
    },
    metricValue: {
      color: theme.colors.onSurface,
      fontWeight: "700"
    },
    metricLabel: {
      color: theme.colors.textMuted
    }
  }) satisfies Record<string, object>;

export function ProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const profileQuery = useQuery({
    queryKey: queryKeys.citizenProfile,
    queryFn: () => citizenApi.getProfile()
  });

  const profile = profileQuery.data ?? demoCitizenProfile;

  return (
    <ScreenContainer
      eyebrow="Profile"
      title="Profile"
      description="Account and impact."
    >
      <InfoCard title="Identity" icon="account-circle-outline">
        <View style={styles.identityStack}>
          <Text variant="titleMedium">{profile.user.displayName}</Text>
          <Text variant="bodyMedium" style={styles.muted}>
            {profile.user.email}
          </Text>
        </View>
      </InfoCard>

      <InfoCard title="Gamification" icon="trophy-outline">
        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <Text variant="titleLarge" style={styles.metricValue}>
              {profile.gamification.points}
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>
              Points
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text variant="titleLarge" style={styles.metricValue}>
              {profile.gamification.level}
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>
              Level
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text variant="titleLarge" style={styles.metricValue}>
              #{profile.gamification.leaderboardPosition}
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>
              Rank
            </Text>
          </View>
        </View>
        <Text variant="bodyMedium" style={styles.muted}>
          Badges:{" "}
          {profile.gamification.badges.length > 0
            ? profile.gamification.badges.join(", ")
            : "None yet"}
        </Text>
      </InfoCard>

      <InfoCard title="Impact" icon="chart-line">
        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <Text variant="titleLarge" style={styles.metricValue}>
              {profile.impact.reportsSubmitted}
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>
              Reports
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text variant="titleLarge" style={styles.metricValue}>
              {profile.impact.reportsResolved}
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>
              Resolved
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text variant="titleLarge" style={styles.metricValue}>
              {profile.impact.estimatedWasteDivertedKg}kg
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>
              Waste diverted
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text variant="titleLarge" style={styles.metricValue}>
              {profile.impact.estimatedCo2SavedKg}kg
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>
              CO2 saved
            </Text>
          </View>
        </View>
      </InfoCard>
    </ScreenContainer>
  );
}
