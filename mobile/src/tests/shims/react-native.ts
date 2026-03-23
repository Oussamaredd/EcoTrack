export const Platform = {
  OS: "ios",
  select: <T,>(options: { ios?: T; android?: T; default?: T }) =>
    options.ios ?? options.default,
};

export const AppState = {
  currentState: "active",
  addEventListener: () => ({
    remove: () => undefined,
  }),
};

export const Vibration = {
  vibrate: () => undefined,
};

