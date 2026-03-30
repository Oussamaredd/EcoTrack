import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";
import { useCreateCitizenReport } from "../hooks/useCitizen";
import {
  DEFAULT_CITIZEN_REPORT_TYPE,
  citizenReportTypes,
  type CitizenReportType,
} from "../lib/citizenReports";
import { apiClient } from "../services/api";
import "../styles/OperationsPages.css";

type ContainerOption = {
  id: string;
  code: string;
  label: string;
  fillLevelPercent?: number | null;
  status?: string | null;
  zoneName?: string | null;
};

type StatusTone = "success" | "error";

const formatContainerStatus = (value?: string | null) => {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const formatFillLevel = (value?: number | null) =>
  typeof value === "number" ? `${Math.round(value)}%` : "Unavailable";

export default function CitizenReportPage() {
  const [containerId, setContainerId] = useState("");
  const [reportType, setReportType] = useState<CitizenReportType>(
    DEFAULT_CITIZEN_REPORT_TYPE,
  );
  const [description, setDescription] = useState("");
  const [reportedLocation, setReportedLocation] = useState({ latitude: "", longitude: "" });
  const [photoUrl, setPhotoUrl] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("success");
  const [locationTone, setLocationTone] = useState<StatusTone>("success");

  const containersQuery = useQuery({
    queryKey: ["containers-options"],
    queryFn: async () => apiClient.get("/api/containers?page=1&pageSize=100"),
  });

  const createReportMutation = useCreateCitizenReport();
  const supportsGeolocation = typeof window !== "undefined" && "geolocation" in navigator;

  const containerOptions = useMemo(() => {
    const rows = Array.isArray(
      (containersQuery.data as { containers?: unknown[] } | undefined)?.containers,
    )
      ? ((containersQuery.data as { containers: ContainerOption[] }).containers ?? [])
      : [];

    return rows.map((item) => ({
      id: item.id,
      code: item.code,
      label: item.label,
      fillLevelPercent: item.fillLevelPercent ?? null,
      status: item.status ?? null,
      zoneName: item.zoneName ?? null,
    }));
  }, [containersQuery.data]);

  const selectedContainer = useMemo(
    () => containerOptions.find((item) => item.id === containerId) ?? null,
    [containerId, containerOptions],
  );

  const selectedReportType =
    citizenReportTypes.find((item) => item.value === reportType) ?? citizenReportTypes[0];

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmationMessage("");

    try {
      const response = (await createReportMutation.mutateAsync({
        containerId,
        reportType,
        description: description.trim() || undefined,
        latitude: reportedLocation.latitude || undefined,
        longitude: reportedLocation.longitude || undefined,
        photoUrl: photoUrl || undefined,
      })) as { confirmationMessage?: string };

      setStatusTone("success");
      setConfirmationMessage(
        response.confirmationMessage ??
          "Report submitted. Thank you for helping your community.",
      );
      setDescription("");
      setPhotoUrl("");
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "Failed to submit report.";
      setStatusTone("error");
      setConfirmationMessage(fallback);
    }
  };

  const updateReportedLocation = (field: "latitude" | "longitude", value: string) => {
    if (locationMessage) {
      setLocationMessage("");
    }

    setReportedLocation((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const captureDeviceLocation = () => {
    if (!supportsGeolocation) {
      setLocationTone("error");
      setLocationMessage("Device geolocation is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReportedLocation({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setLocationTone("success");
        setLocationMessage("Location captured from your device.");
      },
      () => {
        setLocationTone("error");
        setLocationMessage("We could not access your device location. Enter coordinates manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );
  };

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <h1>Report Container Issue</h1>
        <p>
          Select an existing collection point, review its latest known state,
          and send a typed issue report for manager triage.
        </p>
      </header>

      <form className="ops-card ops-form" onSubmit={onSubmit}>
        <p className="ops-helper">
          Citizens report issues on existing mapped containers only. EcoTrack
          records the selected container context and operations validates the
          incident before dispatching field work.
        </p>

        <div className="ops-field">
          <label htmlFor="citizen-report-container" className="ops-label">
            Container
          </label>
          <select
            id="citizen-report-container"
            className="ops-select"
            value={containerId}
            onChange={(event) => setContainerId(event.target.value)}
            required
          >
            <option value="">Select a container</option>
            {containerOptions.map((container) => (
              <option key={container.id} value={container.id}>
                {container.code} - {container.label}
              </option>
            ))}
          </select>
        </div>

        {selectedContainer ? (
          <article className="ops-card">
            <h2>Selected Container Context</h2>
            <p className="ops-card-intro">
              {selectedContainer.code} - {selectedContainer.label}
            </p>
            <div className="ops-grid ops-grid-3">
              <div className="ops-field">
                <span className="ops-label">Zone</span>
                <span>{selectedContainer.zoneName ?? "Unavailable"}</span>
              </div>
              <div className="ops-field">
                <span className="ops-label">Status</span>
                <span>{formatContainerStatus(selectedContainer.status)}</span>
              </div>
              <div className="ops-field">
                <span className="ops-label">Last known fill</span>
                <span>{formatFillLevel(selectedContainer.fillLevelPercent)}</span>
              </div>
            </div>
          </article>
        ) : null}

        <div className="ops-field">
          <label htmlFor="citizen-report-type" className="ops-label">
            Issue type
          </label>
          <select
            id="citizen-report-type"
            className="ops-select"
            value={reportType}
            onChange={(event) => setReportType(event.target.value as CitizenReportType)}
          >
            {citizenReportTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="ops-helper">{selectedReportType.helper}</p>
        </div>

        <div className="ops-field">
          <label htmlFor="citizen-report-description" className="ops-label">
            Details (optional)
          </label>
          <textarea
            id="citizen-report-description"
            className="ops-textarea"
            rows={4}
            placeholder="Add context that helps operations validate the issue."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="ops-grid ops-grid-2 sm:grid-cols-2">
          <div className="ops-field">
            <label htmlFor="citizen-report-latitude" className="ops-label">
              Latitude (optional)
            </label>
            <input
              id="citizen-report-latitude"
              className="ops-input"
              inputMode="decimal"
              value={reportedLocation.latitude}
              onChange={(event) => updateReportedLocation("latitude", event.target.value)}
            />
          </div>
          <div className="ops-field">
            <label htmlFor="citizen-report-longitude" className="ops-label">
              Longitude (optional)
            </label>
            <input
              id="citizen-report-longitude"
              className="ops-input"
              inputMode="decimal"
              value={reportedLocation.longitude}
              onChange={(event) => updateReportedLocation("longitude", event.target.value)}
            />
          </div>
        </div>

        <div className="ops-actions">
          <button
            type="button"
            className="ops-btn ops-btn-outline"
            onClick={captureDeviceLocation}
            disabled={createReportMutation.isPending}
          >
            Use My Location
          </button>
        </div>

        {locationMessage ? (
          <p
            className={
              locationTone === "success"
                ? "ops-status ops-status-success"
                : "ops-status ops-status-error"
            }
            role="status"
          >
            {locationMessage}
          </p>
        ) : null}

        <div className="ops-field">
          <label htmlFor="citizen-report-photo-url" className="ops-label">
            Photo URL (optional, http/https)
          </label>
          <input
            id="citizen-report-photo-url"
            type="url"
            className="ops-input"
            placeholder="https://example.com/container.jpg"
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
          />
        </div>

        <div className="ops-actions">
          <button
            type="submit"
            className="ops-btn ops-btn-success"
            disabled={createReportMutation.isPending || containersQuery.isLoading}
          >
            {createReportMutation.isPending ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </form>

      {containersQuery.isError ? (
        <p className="ops-status ops-status-error">
          Could not load container options. Please refresh.
        </p>
      ) : null}

      {confirmationMessage ? (
        <p
          className={
            statusTone === "success"
              ? "ops-status ops-status-success"
              : "ops-status ops-status-error"
          }
          role="status"
          aria-live="polite"
        >
          {confirmationMessage}
        </p>
      ) : null}
    </section>
  );
}
