import type { ComponentProps } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Chip, Text } from "react-native-paper";

import { citizenApi } from "@api/modules/citizen";
import { InfoCard } from "@/components/InfoCard";
import { MetricCard } from "@/components/MetricCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { demoCitizenChallenges, demoCitizenProfile } from "@/lib/demoCitizenData";
import { queryKeys } from "@/lib/queryKeys";
import type { AppTheme } from "@/theme/theme";
import { useAppTheme, useThemedStyles } from "@/theme/useAppTheme";

type CitizenShortcut = {
  key: string;
  title: string;
  description: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  href: "/(tabs)/report" | "/(tabs)/challenges" | "/(tabs)/history" | "/(tabs)/schedule";
};

const citizenShortcuts: CitizenShortcut[] = [
  {
    key: "report",
    title: "Report",
    description: "Map and submit.",
    icon: "map-marker-alert-outline",
    href: "/(tabs)/report"
  },
  {
    key: "challenges",
    title: "Challenges",
    description: "Points and goals.",
    icon: "trophy-outline",
    href: "/(tabs)/challenges"
  },
  {
    key: "history",
    title: "History",
    description: "Reports and status.",
    icon: "history",
    href: "/(tabs)/history"
  },
  {
    key: "schedule",
    title: "Schedule",
    description: "Reminders and service.",
    icon: "calendar-clock-outline",
    href: "/(tabs)/schedule"
  }
];

const createStyles = (theme: AppTheme) =>
  ({
    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: theme.spacing.sm
    },
    shortcutGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: theme.spacing.sm
    },
    shortcutCard: {
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
      borderRadius: theme.shape.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface
    },
    shortcutCardGrid: {
      width: "48%"
    },
    shortcutCardSingleColumn: {
      width: "100%"
    },
    shortcutCardPressed: {
      opacity: 0.92
    },
    shortcutIconWrap: {
      width: 42,
      height: 42,
      borderRadius: theme.shape.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted
    },
    shortcutTitle: {
      color: theme.colors.onSurface,
      fontWeight: "700"
    },
    shortcutDescription: {
      color: theme.colors.textMuted,
      lineHeight: 18
    },
    shortcutHint: {
      color: theme.colors.textMuted,
      fontWeight: "600",
      letterSpacing: 0.3
    },
    shortcutFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: theme.spacing.xs
    },
    impactRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm
    },
    impactLabel: {
      color: theme.colors.textMuted
    },
    impactValue: {
      flexShrink: 1,
      color: theme.colors.onSurface,
      textAlign: "right",
      fontWeight: "600"
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs
    },
    chip: {
      backgroundColor: theme.colors.primarySurface
    },
    heroCard: {
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
      borderRadius: theme.shape.md,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySurface
    },
    heroTitle: {
      color: theme.colors.onSurface,
      fontWeight: "700"
    },
    heroActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    }
  }) satisfies Record<string, object>;

export function DashboardScreen() {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const profileQuery = useQuery({
    queryKey: queryKeys.citizenProfile,
    queryFn: () => citizenApi.getProfile()
  });
  const challengesQuery = useQuery({
    queryKey: queryKeys.citizenChallenges,
    queryFn: () => citizenApi.getChallenges()
  });

  const profile = profileQuery.data ?? demoCitizenProfile;
  const liveChallenges = challengesQuery.data?.challenges ?? [];
  const challenges = liveChallenges.length > 0 ? liveChallenges : demoCitizenChallenges;
  const activeChallenges = challenges.filter(
    (challenge) =>
      challenge.enrollmentStatus !== "not_enrolled" &&
      challenge.enrollmentStatus !== "completed"
  );
  const completedChallenges = challenges.filter(
    (challenge) => challenge.enrollmentStatus === "completed"
  );
  const challengeSyncLabel = `${activeChallenges.length} active challenges`;
  const isSingleColumn = width < 540;
  const primaryShortcut = citizenShortcuts[0];
  const secondaryShortcuts = citizenShortcuts.slice(1);

  return (
    <ScreenContainer
      eyebrow="Citizen"
      title="Home"
      description="Report, challenges, history, schedule."
    >
      <InfoCard title="Report" icon="map-marker-alert-outline">
        <View style={styles.heroCard}>
          <Text variant="titleLarge" style={styles.heroTitle}>
            {primaryShortcut?.title ?? "Report"}
          </Text>
          <View style={styles.heroActions}>
            <Button
              mode="contained"
              icon="map-marker-alert-outline"
              onPress={() => router.push(primaryShortcut?.href ?? "/(tabs)/report")}
            >
              Report a container
            </Button>
            <Button mode="outlined" icon="history" onPress={() => router.push("/(tabs)/history")}>
              View history
            </Button>
          </View>
          <View style={styles.chipRow}>
            <Chip style={styles.chip} textStyle={{ color: theme.colors.primaryStrong }}>
              {profile.gamification.points} points
            </Chip>
            <Chip style={styles.chip} textStyle={{ color: theme.colors.primaryStrong }}>
              {challengeSyncLabel}
            </Chip>
            {completedChallenges.length > 0 ? (
              <Chip style={styles.chip} textStyle={{ color: theme.colors.primaryStrong }}>
                {completedChallenges.length} completed
              </Chip>
            ) : null}
          </View>
        </View>
      </InfoCard>

      <InfoCard title="Features" icon="apps">
        <View style={styles.shortcutGrid}>
          {secondaryShortcuts.map((shortcut) => (
            <Pressable
              key={shortcut.key}
              onPress={() => router.push(shortcut.href)}
              style={({ pressed }) => [
                styles.shortcutCard,
                isSingleColumn ? styles.shortcutCardSingleColumn : styles.shortcutCardGrid,
                pressed ? styles.shortcutCardPressed : null
              ]}
            >
              <View style={styles.shortcutIconWrap}>
                <MaterialCommunityIcons
                  name={shortcut.icon}
                  size={24}
                  color={theme.colors.primaryStrong}
                />
              </View>
              <Text variant="titleMedium" style={styles.shortcutTitle}>
                {shortcut.title}
              </Text>
              <Text variant="bodySmall" style={styles.shortcutDescription}>
                {shortcut.description}
              </Text>
              <View style={styles.shortcutFooter}>
                <Text variant="labelLarge" style={styles.shortcutHint}>
                  Open module
                </Text>
                <MaterialCommunityIcons
                  name="arrow-top-right"
                  size={18}
                  color={theme.colors.primaryStrong}
                />
              </View>
            </Pressable>
          ))}
        </View>
      </InfoCard>

      <InfoCard title="Overview" icon="view-grid-outline">
        <View style={styles.metricGrid}>
          <MetricCard label="Points" value={profile.gamification.points} forceGrid />
          <MetricCard label="Level" value={profile.gamification.level} forceGrid />
          <MetricCard
            label="Leaderboard"
            value={`#${profile.gamification.leaderboardPosition}`}
            forceGrid
          />
          <MetricCard label="Reports" value={profile.impact.reportsSubmitted} forceGrid />
        </View>
      </InfoCard>

      <InfoCard title="Impact" icon="chart-line">
        <View style={styles.impactRow}>
          <Text variant="bodyMedium" style={styles.impactLabel}>
            Resolved reports
          </Text>
          <Text variant="bodyMedium" style={styles.impactValue}>
            {profile.impact.reportsResolved}
          </Text>
        </View>
        <View style={styles.impactRow}>
          <Text variant="bodyMedium" style={styles.impactLabel}>
            Waste diverted
          </Text>
          <Text variant="bodyMedium" style={styles.impactValue}>
            {profile.impact.estimatedWasteDivertedKg} kg
          </Text>
        </View>
        <View style={styles.impactRow}>
          <Text variant="bodyMedium" style={styles.impactLabel}>
            CO2 saved
          </Text>
          <Text variant="bodyMedium" style={styles.impactValue}>
            {profile.impact.estimatedCo2SavedKg} kg
          </Text>
        </View>
      </InfoCard>

      <InfoCard title="Badges" icon="trophy-award">
        <View style={styles.chipRow}>
          {(profile.gamification.badges.length > 0
            ? profile.gamification.badges
            : ["No badges yet"]).map((badge) => (
            <Chip key={badge} style={styles.chip} textStyle={{ color: theme.colors.primaryStrong }}>
              {badge}
            </Chip>
          ))}
        </View>
        <View style={styles.impactRow}>
          <Text variant="bodyMedium" style={styles.impactLabel}>
            Active challenges
          </Text>
          <Text variant="bodyMedium" style={styles.impactValue}>
            {activeChallenges.length}
          </Text>
        </View>
      </InfoCard>
    </ScreenContainer>
  );
}
