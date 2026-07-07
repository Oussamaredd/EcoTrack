import { View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import type { AppTheme } from "@/theme/theme";
import { useThemedStyles } from "@/theme/useAppTheme";

type AppStateScreenProps = {
  title: string;
  description: string;
  actionLabel?: string;
  isBusy?: boolean;
  onAction?: () => void;
};

const createStyles = (theme: AppTheme) =>
  ({
    stateCard: {
      alignItems: "center",
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.lg
    },
    stateText: {
      color: theme.colors.textMuted,
      lineHeight: 20,
      textAlign: "center"
    }
  }) satisfies Record<string, object>;

export function AppStateScreen({
  title,
  description,
  actionLabel,
  isBusy,
  onAction
}: AppStateScreenProps) {
  const styles = useThemedStyles(createStyles);
  const headerTitle = isBusy ? "EcoTrack" : title;

  return (
    <ScreenContainer
      eyebrow="EcoTrack Mobile"
      title={headerTitle}
      description={description}
      actions={
        actionLabel && onAction ? (
          <Button mode="contained" onPress={onAction} disabled={isBusy}>
            {actionLabel}
          </Button>
        ) : undefined
      }
    >
      <InfoCard title={title}>
        <View style={styles.stateCard}>
          {isBusy ? <ActivityIndicator animating size="large" /> : null}
          <Text variant="bodyMedium" style={styles.stateText}>
            {description}
          </Text>
        </View>
      </InfoCard>
    </ScreenContainer>
  );
}
