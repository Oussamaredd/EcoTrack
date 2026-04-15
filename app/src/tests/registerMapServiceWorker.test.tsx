import { afterEach, describe, expect, it, vi } from "vitest";

const setDocumentReadyState = (state: DocumentReadyState) => {
  Object.defineProperty(document, "readyState", {
    configurable: true,
    value: state,
  });
};

describe("registerMapServiceWorker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    setDocumentReadyState("complete");
  });

  it("registers the service worker once and posts the tile-cache config", async () => {
    setDocumentReadyState("complete");

    const activeWorker = {
      postMessage: vi.fn(),
    };
    const registration = {
      active: activeWorker,
      waiting: null,
      installing: null,
    };

    vi.stubGlobal("navigator", {
      serviceWorker: {
        register: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
      },
    });

    const { registerMapServiceWorker } = await import("../lib/registerMapServiceWorker");

    registerMapServiceWorker();
    registerMapServiceWorker();
    await Promise.resolve();
    await Promise.resolve();

    expect(navigator.serviceWorker.register).toHaveBeenCalledTimes(1);
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/ecotrack-map-sw.js", {
      scope: "/",
    });
    expect(activeWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ECOTRACK_CONFIGURE_TILE_CACHE",
        origins: expect.any(Array),
      }),
    );
  });

  it("defers registration until the window load event when the document is still loading", async () => {
    setDocumentReadyState("loading");

    const waitingWorker = {
      postMessage: vi.fn(),
    };
    const readyWorker = {
      postMessage: vi.fn(),
    };
    const registration = {
      active: null,
      waiting: waitingWorker,
      installing: null,
      sync: {
        register: vi.fn().mockResolvedValue(undefined),
      },
    };

    const register = vi.fn().mockResolvedValue(registration);
    vi.stubGlobal("navigator", {
      serviceWorker: {
        register,
        ready: Promise.resolve({
          active: readyWorker,
          waiting: null,
          installing: null,
        }),
      },
    });

    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const { registerMapServiceWorker } = await import("../lib/registerMapServiceWorker");

    registerMapServiceWorker();

    expect(register).not.toHaveBeenCalled();
    expect(addEventListenerSpy).toHaveBeenCalledWith("load", expect.any(Function), { once: true });

    const loadHandler = addEventListenerSpy.mock.calls[0]?.[1];
    expect(loadHandler).toBeTypeOf("function");

    if (typeof loadHandler !== "function") {
      throw new Error("Expected the load listener callback to be a function");
    }

    loadHandler(new Event("load"));
    await Promise.resolve();
    await Promise.resolve();

    expect(register).toHaveBeenCalledWith("/ecotrack-map-sw.js", {
      scope: "/",
    });
    expect(registration.sync.register).toHaveBeenCalledWith("ecotrack-refresh-shell");
    expect(waitingWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ECOTRACK_CONFIGURE_TILE_CACHE",
        origins: expect.any(Array),
      }),
    );
    await vi.waitFor(() => {
      expect(readyWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ECOTRACK_CONFIGURE_TILE_CACHE",
          origins: expect.any(Array),
        }),
      );
    });
  });

  it("swallows registration failures", async () => {
    setDocumentReadyState("complete");

    const register = vi.fn().mockRejectedValue(new Error("boom"));
    vi.stubGlobal("navigator", {
      serviceWorker: {
        register,
        ready: Promise.resolve({
          active: null,
          waiting: null,
          installing: null,
        }),
      },
    });

    const { registerMapServiceWorker } = await import("../lib/registerMapServiceWorker");

    expect(() => registerMapServiceWorker()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();

    expect(register).toHaveBeenCalledTimes(1);
  });
});
