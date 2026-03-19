import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "2m", target: 200 },
    { duration: "1m", target: 350 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<200", "p(99)<500"],
  },
};

const apiBaseUrl = __ENV.API_BASE_URL || "http://127.0.0.1:3001";
const sensorCount = 2000;
const messagesPerDay = 500000;
const dailyTargetRps = messagesPerDay / 86400;

function generateMeasurement(sensorIndex) {
  const sensorUid = `sensor-${String(sensorIndex).padStart(4, '0')}`;
  return {
    deviceUid: sensorUid,
    measuredAt: new Date().toISOString(),
    fillLevelPercent: Math.floor(Math.random() * 100),
    temperatureC: Math.floor(Math.random() * 40) - 10,
    batteryPercent: Math.floor(Math.random() * 100),
    signalStrength: -Math.floor(Math.random() * 80) - 40,
  };
}

function generateBatch(batchSize) {
  const measurements = [];
  for (let i = 0; i < batchSize; i++) {
    const sensorIndex = Math.floor(Math.random() * sensorCount);
    measurements.push(generateMeasurement(sensorIndex));
  }
  return { measurements };
}

export default function () {
  const batchSizes = [10, 50, 100];
  const batchSize = batchSizes[Math.floor(Math.random() * batchSizes.length)];
  
  const payload = JSON.stringify(generateBatch(batchSize));
  
  const params = {
    headers: {
      "Content-Type": "application/json",
    },
    tags: { gate: "m2.1-iot-ingestion" },
  };

  const response = http.post(`${apiBaseUrl}/api/iot/v1/measurements/batch`, payload, params);

  check(response, {
    "batch ingestion returns 202": (res) => res.status === 202,
    "response has batchId": (res) => {
      try {
        const body = JSON.parse(res.body);
        return body.batchId !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  sleep(0.1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

function textSummary(data, opts) {
  const indent = opts.indent || "";

  let output = `${indent}IoT Ingestion Benchmark Results\n`;
  output += `${indent}=============================\n\n`;
  output += `${indent}Target daily volume: ${messagesPerDay} messages/day (${dailyTargetRps.toFixed(2)} req/s average)\n\n`;

  if (data.metrics.http_req_duration) {
    const duration = data.metrics.http_req_duration;
    output += `${indent}Request Duration:\n`;
    output += `${indent}  avg: ${duration.values.avg.toFixed(2)}ms\n`;
    output += `${indent}  p95: ${duration.values["p(95)"].toFixed(2)}ms\n`;
    output += `${indent}  p99: ${duration.values["p(99)"].toFixed(2)}ms\n`;
    output += `${indent}  max: ${duration.values.max.toFixed(2)}ms\n\n`;
  }

  if (data.metrics.http_reqs) {
    const reqs = data.metrics.http_reqs;
    output += `${indent}Throughput:\n`;
    output += `${indent}  total: ${reqs.values.count}\n`;
    output += `${indent}  rate: ${reqs.values.rate.toFixed(2)} req/s\n\n`;
  }

  if (data.metrics.http_req_failed) {
    const failed = data.metrics.http_req_failed;
    output += `${indent}Errors:\n`;
    output += `${indent}  rate: ${(failed.values.rate * 100).toFixed(2)}%\n\n`;
  }

  return output;
}
