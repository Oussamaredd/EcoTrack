import { useMemo, useState } from "react";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { View } from "react-native";
import { Button, HelperText, ProgressBar, Text } from "react-native-paper";

import { citizenApi, type CitizenChallenge } from "@api/modules/citizen";
import { InfoCard } from "@/components/InfoCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { demoCitizenChallenges } from "@/lib/demoCitizenData";
import { queryKeys } from "@/lib/queryKeys";
import type { AppTheme } from "@/theme/theme";
import { useThemedStyles } from "@/theme/useAppTheme";

type ChallengeState = "active" | "available" | "completed";

const resolveChallengeState = (challenge: CitizenChallenge): ChallengeState => {
  if (challenge.enrollmentStatus === "not_enrolled") {
    return "available";
  }

  if (challenge.enrollmentStatus === "completed") {
    return "completed";
  }

  return "active";
};

const isDemoChallenge = (challengeId: string) => challengeId.startsWith("demo-");

const applyDemoChallengeAction = (
  challenges: CitizenChallenge[],
  challengeId: string,
  action: "enroll" | "progress"
) =>
  challenges.map((challenge) => {
    if (challenge.id !== challengeId) {
      return challenge;
    }

    if (action === "enroll") {
      return {
        ...challenge,
        enrollmentStatus: "in_progress"
      };
    }

    const nextProgress = Math.min(challenge.progress + 1, challenge.targetValue);
    const nextCompletionPercent = Math.round((nextProgress / challenge.targetValue) * 100);

    return {
      ...challenge,
      progress: nextProgress,
      completionPercent: nextCompletionPercent,
      enrollmentStatus:
        nextProgress >= challenge.targetValue ? "completed" : challenge.enrollmentStatus
    };
  });

const createStyles = (theme: AppTheme) =>
  ({
    list: {
      gap: theme.spacing.md
    },
    cardBody: {
      gap: theme.spacing.sm
    },
    meta: {
      color: theme.colors.textMuted,
      lineHeight: 20
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm
    },
    reward: {
      color: theme.colors.primaryStrong,
      fontWeight: "700"
    },
    actionButton: {
      minWidth: 144
    }
  }) satisfies Record<string, object>;

export function ChallengesScreen() {
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const [demoChallenges, setDemoChallenges] = useState(demoCitizenChallenges);
  const [pendingChallengeId, setPendingChallengeId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const challengesQuery = useQuery({
    queryKey: queryKeys.citizenChallenges,
    queryFn: () => citizenApi.getChallenges()
  });
  const enrollMutation = useMutation({
    mutationFn: (challengeId: string) => citizenApi.enrollInChallenge(challengeId)
  });
  const progressMutation = useMutation({
    mutationFn: (challengeId: string) =>
      citizenApi.updateChallengeProgress(challengeId, 1)
  });
  const liveChallenges = useMemo(
    () => challengesQuery.data?.challenges ?? [],
    [challengesQuery.data?.challenges]
  );
  const challenges = useMemo(
    () => (liveChallenges.length > 0 ? liveChallenges : demoChallenges),
    [demoChallenges, liveChallenges]
  );

  const refreshChallenges = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.citizenChallenges }),
      queryClient.invalidateQueries({ queryKey: queryKeys.citizenProfile }),
      challengesQuery.refetch()
    ]);
  };

  const runChallengeAction = async (
    challengeId: string,
    title: string,
    action: "enroll" | "progress"
  ) => {
    setPendingChallengeId(challengeId);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      if (isDemoChallenge(challengeId)) {
        setDemoChallenges((currentChallenges) =>
          applyDemoChallengeAction(currentChallenges, challengeId, action)
        );
        setStatusMessage(
          action === "enroll" ? `${title} joined.` : `${title} updated.`
        );
        return;
      }

      if (action === "enroll") {
        await enrollMutation.mutateAsync(challengeId);
        setStatusMessage(`${title} joined.`);
      } else {
        await progressMutation.mutateAsync(challengeId);
        setStatusMessage(`${title} updated.`);
      }
      await refreshChallenges();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Challenge update failed.");
    } finally {
      setPendingChallengeId(null);
    }
  };

  return (
    <ScreenContainer
      eyebrow="Gamification"
      title="Challenges"
      description="Citizen goals."
    >
      {statusMessage ? (
        <HelperText type="info" visible>
          {statusMessage}
        </HelperText>
      ) : null}
      {errorMessage ? (
        <HelperText type="error" visible>
          {errorMessage}
        </HelperText>
      ) : null}

      {challenges.length === 0 ? (
        <InfoCard title="No challenges" icon="trophy-outline">
          <Text variant="bodyMedium" style={styles.meta}>
            No citizen challenges are available yet.
          </Text>
        </InfoCard>
      ) : (
        <View style={styles.list}>
          {challenges.map((challenge) => {
            const state = resolveChallengeState(challenge);
            const isPending = pendingChallengeId === challenge.id;
            const progressLabel = `${challenge.progress}/${challenge.targetValue} complete`;

            return (
              <InfoCard
                key={challenge.id}
                title={challenge.title}
                icon={state === "completed" ? "check-decagram-outline" : "flag-checkered"}
              >
                <View style={styles.cardBody}>
                  <Text variant="bodyMedium">{challenge.description}</Text>
                  <Text variant="bodySmall" style={styles.meta}>
                    {progressLabel} | {challenge.completionPercent}%
                  </Text>
                  <ProgressBar progress={challenge.completionPercent / 100} />
                  <View style={styles.footer}>
                    <Text variant="labelLarge" style={styles.reward}>
                      {challenge.rewardPoints} pts
                    </Text>
                    {state === "available" ? (
                      <Button
                        mode="contained"
                        style={styles.actionButton}
                        loading={isPending}
                        disabled={isPending}
                        onPress={() => {
                          void runChallengeAction(challenge.id, challenge.title, "enroll");
                        }}
                      >
                        Join goal
                      </Button>
                    ) : null}
                    {state === "active" ? (
                      <Button
                        mode="contained"
                        style={styles.actionButton}
                        loading={isPending}
                        disabled={isPending}
                        onPress={() => {
                          void runChallengeAction(challenge.id, challenge.title, "progress");
                        }}
                      >
                        Add progress
                      </Button>
                    ) : null}
                    {state === "completed" ? (
                      <Button mode="outlined" style={styles.actionButton} disabled>
                        Completed
                      </Button>
                    ) : null}
                  </View>
                </View>
              </InfoCard>
            );
          })}
        </View>
      )}

      {challenges.length === 0 ? (
        <Button
          mode="contained"
          icon="map-marker-alert-outline"
          onPress={() => router.push("/(tabs)/report")}
        >
          Report a container
        </Button>
      ) : null}
    </ScreenContainer>
  );
}
