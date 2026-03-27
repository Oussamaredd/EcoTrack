# Kubernetes Performance Templates

These manifests close the repo-owned delivery pieces for M11.9.

They include:

- a resource-constrained API `Deployment`
- a `Service`
- `HorizontalPodAutoscaler` with CPU and memory targets
- `PodDisruptionBudget`
- `ServiceMonitor`
- optional KEDA `ScaledObject` for Prometheus-driven scale-out

Treat these as templates. Wire image names, namespaces, secrets, and Prometheus adapter metrics to the target cluster before rollout.
