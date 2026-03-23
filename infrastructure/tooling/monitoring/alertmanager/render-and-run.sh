#!/bin/sh
set -eu

DEV_WEBHOOK_URL="${ALERTMANAGER_DEV_WEBHOOK_URL:-http://alert-webhook-sink:8080/alerts}"
WARNING_RECEIVER="${ALERTMANAGER_WARNING_RECEIVER:-dev-webhook}"
CRITICAL_RECEIVER="${ALERTMANAGER_CRITICAL_RECEIVER:-dev-webhook}"
GROUP_WAIT="${ALERTMANAGER_GROUP_WAIT:-30s}"
GROUP_INTERVAL="${ALERTMANAGER_GROUP_INTERVAL:-5m}"
REPEAT_INTERVAL="${ALERTMANAGER_REPEAT_INTERVAL:-4h}"
SLACK_WEBHOOK_URL="${ALERTMANAGER_SLACK_WEBHOOK_URL:-http://alert-webhook-sink:8080/slack}"
SLACK_CHANNEL="${ALERTMANAGER_SLACK_CHANNEL:-#ecotrack-alerts}"
PAGERDUTY_ROUTING_KEY="${ALERTMANAGER_PAGERDUTY_ROUTING_KEY:-00000000000000000000000000000000}"

cat > /etc/alertmanager/alertmanager.yml <<EOF
global:
  resolve_timeout: 5m

route:
  receiver: dev-webhook
  group_by: ['alertname', 'severity', 'team']
  group_wait: ${GROUP_WAIT}
  group_interval: ${GROUP_INTERVAL}
  repeat_interval: ${REPEAT_INTERVAL}
  routes:
    - matchers:
        - severity="critical"
      receiver: ${CRITICAL_RECEIVER}
    - matchers:
        - severity="warning"
      receiver: ${WARNING_RECEIVER}

inhibit_rules:
  - source_matchers:
      - severity="critical"
    target_matchers:
      - severity="warning"
    equal:
      - alertname
      - team

receivers:
  - name: dev-webhook
    webhook_configs:
      - url: "${DEV_WEBHOOK_URL}"
        send_resolved: true

  - name: slack-warning
    slack_configs:
      - api_url: "${SLACK_WEBHOOK_URL}"
        channel: "${SLACK_CHANNEL}"
        title: '{{ .CommonLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}: {{ .Annotations.description }}{{ "\\n" }}{{ end }}'
        send_resolved: true

  - name: pagerduty-critical
    pagerduty_configs:
      - routing_key: "${PAGERDUTY_ROUTING_KEY}"
        description: '{{ .CommonLabels.alertname }}'
        severity: '{{ .CommonLabels.severity }}'
        send_resolved: true
EOF

exec /bin/alertmanager --config.file=/etc/alertmanager/alertmanager.yml --storage.path=/alertmanager
