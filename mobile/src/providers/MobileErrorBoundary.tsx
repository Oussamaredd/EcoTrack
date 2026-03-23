import React from "react";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";

import { reportMobileError } from "@/monitoring/clientTelemetry";

type MobileErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class MobileErrorBoundary extends React.Component<
  React.PropsWithChildren,
  MobileErrorBoundaryState
> {
  state: MobileErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error) {
    void reportMobileError({
      type: "MOBILE_RUNTIME",
      message: error.message,
      context: "mobile.react.error-boundary",
      severity: "critical",
      stack: error.stack ?? null,
      error
    });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 12
        }}
      >
        <Text variant="headlineSmall">Something went wrong</Text>
        <Text variant="bodyMedium">
          EcoTrack hit an unexpected mobile error. Try opening the screen again.
        </Text>
        <Button
          mode="contained"
          onPress={() =>
            this.setState({
              hasError: false,
              error: null
            })
          }
        >
          Try again
        </Button>
      </View>
    );
  }
}
