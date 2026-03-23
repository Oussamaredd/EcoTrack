import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const composeFile = path.join(repoRoot, 'infrastructure', 'docker-compose.yml');
const dockerEnvFile = path.join(repoRoot, 'infrastructure', 'environments', '.env.docker');
const reportDirectory = path.join(repoRoot, 'tmp', 'chaos');
const defaultApiBaseUrl = 'http://localhost:3001/api';
const defaultBatchSize = 25;
const defaultMeasurementCount = 50;
const defaultOutageMs = 10_000;
const defaultPollIntervalMs = 2_000;
const defaultTimeoutMs = 180_000;

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);
const getFlagValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  if (index < 0 || index === args.length - 1) {
    return fallback;
  }

  return args[index + 1];
};

const scenarioFlag = getFlagValue('--scenario', 'api-restart');
const scenarios = scenarioFlag === 'all' ? ['api-restart', 'db-outage', 'stale-lease', 'replay-recovery'] : [scenarioFlag];
const apiBaseUrl = getFlagValue('--api-base-url', defaultApiBaseUrl).replace(/\/$/, '');
const apiTransport = getFlagValue('--api-transport', 'auto');
const adminToken = getFlagValue('--admin-token', '');
const reportPath =
  getFlagValue('--report', '') ||
  path.join(reportDirectory, `iot-chaos-report-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}.md`);
const measurementCount = Number(getFlagValue('--measurement-count', String(defaultMeasurementCount)));
const batchSize = Number(getFlagValue('--batch-size', String(defaultBatchSize)));
const outageMs = Number(getFlagValue('--outage-ms', String(defaultOutageMs)));
const pollIntervalMs = Number(getFlagValue('--poll-interval-ms', String(defaultPollIntervalMs)));
const timeoutMs = Number(getFlagValue('--timeout-ms', String(defaultTimeoutMs)));
const skipSeed = hasFlag('--skip-seed');
const dryRun = hasFlag('--dry-run');

const supportedScenarios = new Set(['api-restart', 'db-outage', 'stale-lease', 'replay-recovery']);
const supportedApiTransports = new Set(['auto', 'host', 'docker']);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const parseEnvFile = async (filePath) => {
  const content = await readFile(filePath, 'utf8');
  const entries = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    entries[key] = value;
  }

  return entries;
};

const runCommand = (command, commandArgs, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      ...options,
    });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `Command failed (${command} ${commandArgs.join(' ')}): ${stderr.trim() || stdout.trim() || `exit ${code}`}`,
        ),
      );
    });
  });

const runDockerCompose = async (composeArgs) =>
  runCommand('docker', ['compose', '--env-file', dockerEnvFile, '-f', composeFile, ...composeArgs]);

const fetchTextFromHost = async (url, init) => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with ${response.status}.`);
  }

  return response.text();
};

const fetchJsonFromHost = async (url, init) => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with ${response.status}.`);
  }

  return response.json();
};

const fetchFromDocker = async (url, init, responseType) => {
  const payload = Buffer.from(
    JSON.stringify({
      url,
      init: {
        method: init?.method ?? 'GET',
        headers: init?.headers ?? {},
        body: init?.body ?? null,
      },
      responseType,
    }),
    'utf8',
  ).toString('base64');
  const script = [
    'const payload = JSON.parse(Buffer.from(process.argv[1], "base64").toString("utf8"));',
    'const init = { method: payload.init.method, headers: payload.init.headers };',
    'if (payload.init.body !== null) init.body = payload.init.body;',
    'const response = await fetch(payload.url, init);',
    'const body = await response.text();',
    'process.stdout.write(JSON.stringify({ status: response.status, body }));',
  ].join(' ');
  const { stdout } = await runDockerCompose(['exec', '-T', 'backend', 'node', '-e', script, payload]);
  const parsed = JSON.parse(stdout);
  if (parsed.status < 200 || parsed.status >= 300) {
    throw new Error(`Request to ${url} failed with ${parsed.status}.`);
  }

  return responseType === 'json' ? JSON.parse(parsed.body) : parsed.body;
};

const fetchText = async (url, init) => {
  if (apiTransport === 'host') {
    return fetchTextFromHost(url, init);
  }

  if (apiTransport === 'docker') {
    return fetchFromDocker(url, init, 'text');
  }

  try {
    return await fetchTextFromHost(url, init);
  } catch {
    return fetchFromDocker(url, init, 'text');
  }
};

const fetchJson = async (url, init) => {
  if (apiTransport === 'host') {
    return fetchJsonFromHost(url, init);
  }

  if (apiTransport === 'docker') {
    return fetchFromDocker(url, init, 'json');
  }

  try {
    return await fetchJsonFromHost(url, init);
  } catch {
    return fetchFromDocker(url, init, 'json');
  }
};

const parsePrometheusMetrics = (rawMetrics) => {
  const series = [];
  const metricPattern =
    /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)$/u;

  for (const line of rawMetrics.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(metricPattern);
    if (!match) {
      continue;
    }

    const [, name, labelsBlock = '', valueText] = match;
    const labels = {};
    if (labelsBlock) {
      for (const pair of labelsBlock.split(',')) {
        const separatorIndex = pair.indexOf('=');
        if (separatorIndex < 0) {
          continue;
        }

        const key = pair.slice(0, separatorIndex).trim();
        const value = pair
          .slice(separatorIndex + 1)
          .trim()
          .replace(/^"|"$/g, '')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        labels[key] = value;
      }
    }

    series.push({
      name,
      labels,
      value: Number(valueText),
    });
  }

  return series;
};

const selectMetricValue = (series, metricName, expectedLabels = {}) =>
  series.find(
    (entry) =>
      entry.name === metricName &&
      Object.entries(expectedLabels).every(([key, value]) => entry.labels[key] === value),
  )?.value ?? 0;

const getMetricsSnapshot = async () => {
  const metrics = parsePrometheusMetrics(await fetchText(`${apiBaseUrl}/metrics`));

  return {
    ingestionBacklog: selectMetricValue(metrics, 'ecotrack_iot_ingestion_backlog_total'),
    validatedDeliveryBacklog: selectMetricValue(metrics, 'ecotrack_iot_validated_delivery_backlog_total'),
    timeseriesLag: selectMetricValue(metrics, 'ecotrack_internal_consumer_lag_messages', {
      consumer: 'timeseries_projection',
    }),
    rollupLag: selectMetricValue(metrics, 'ecotrack_internal_consumer_lag_messages', {
      consumer: 'measurement_rollup_projection',
    }),
    timeseriesOldestPendingAgeMs: selectMetricValue(
      metrics,
      'ecotrack_internal_consumer_lag_oldest_pending_age_ms',
      { consumer: 'timeseries_projection' },
    ),
    rollupOldestPendingAgeMs: selectMetricValue(
      metrics,
      'ecotrack_internal_consumer_lag_oldest_pending_age_ms',
      { consumer: 'measurement_rollup_projection' },
    ),
  };
};

const runPsql = async (sqlText, dockerEnv) => {
  const { stdout } = await runDockerCompose([
    'exec',
    '-T',
    'db',
    'psql',
    '-U',
    dockerEnv.POSTGRES_USER,
    '-d',
    dockerEnv.POSTGRES_DB,
    '-At',
    '-F',
    '|',
    '-c',
    sqlText,
  ]);

  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^(?:UPDATE|INSERT|DELETE|SELECT)\s+\d+\s*$/u.test(line) &&
        !/^(?:BEGIN|COMMIT|ROLLBACK)\s*$/u.test(line),
    )
    .join('\n');
};

const getDbSnapshot = async (dockerEnv) => {
  const output = await runPsql(
    `
      SELECT
        (SELECT count(*) FROM iot.ingestion_events) AS staged_total,
        (SELECT count(*) FROM iot.ingestion_events WHERE processing_status = 'validated') AS staged_validated_total,
        (SELECT count(*) FROM iot.validated_measurement_events) AS validated_event_total,
        (SELECT count(*) FROM iot.validated_event_deliveries WHERE consumer_name = 'timeseries_projection' AND processing_status = 'completed') AS completed_timeseries_total,
        (SELECT count(*) FROM iot.validated_event_deliveries WHERE consumer_name = 'measurement_rollup_projection' AND processing_status = 'completed') AS completed_rollup_total,
        (SELECT count(*) FROM iot.measurement_rollups_10m) AS rollup_row_total,
        (SELECT count(*) FROM iot.validated_event_deliveries WHERE processing_status IN ('pending', 'retry', 'processing')) AS pending_delivery_total,
        (SELECT count(*) FROM iot.validated_event_deliveries WHERE processing_status = 'failed') AS failed_delivery_total
    `,
    dockerEnv,
  );

  const [
    stagedTotal,
    stagedValidatedTotal,
    validatedEventTotal,
    completedTimeseriesTotal,
    completedRollupTotal,
    rollupRowTotal,
    pendingDeliveryTotal,
    failedDeliveryTotal,
  ] = output.split('|').map((value) => Number(value));

  return {
    stagedTotal,
    stagedValidatedTotal,
    validatedEventTotal,
    completedTimeseriesTotal,
    completedRollupTotal,
    rollupRowTotal,
    pendingDeliveryTotal,
    failedDeliveryTotal,
  };
};

const computeRpoGap = (snapshot) => ({
  timeseries: snapshot.validatedEventTotal - snapshot.completedTimeseriesTotal,
  rollups: snapshot.validatedEventTotal - snapshot.completedRollupTotal,
  rollupRows: snapshot.validatedEventTotal - snapshot.rollupRowTotal,
});

const waitForApiReadiness = async () => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await fetchJson(`${apiBaseUrl}/health/ready`);
      return;
    } catch {
      await sleep(pollIntervalMs);
    }
  }

  throw new Error(`Timed out waiting for ${apiBaseUrl}/health/ready.`);
};

const waitForBacklogNormalization = async (dockerEnv, baselineMetrics) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const [metricsSnapshot, dbSnapshot] = await Promise.all([
      getMetricsSnapshot(),
      getDbSnapshot(dockerEnv),
    ]);
    const rpoGap = computeRpoGap(dbSnapshot);
    const backlogNormalized =
      metricsSnapshot.ingestionBacklog <= baselineMetrics.ingestionBacklog &&
      metricsSnapshot.validatedDeliveryBacklog <= baselineMetrics.validatedDeliveryBacklog &&
      metricsSnapshot.timeseriesLag <= baselineMetrics.timeseriesLag &&
      metricsSnapshot.rollupLag <= baselineMetrics.rollupLag;
    const rpoHealthy = rpoGap.timeseries <= 0 && rpoGap.rollups <= 0 && rpoGap.rollupRows <= 0;

    if (backlogNormalized && rpoHealthy) {
      return {
        rtoMs: Date.now() - startedAt,
        metricsSnapshot,
        dbSnapshot,
        rpoGap,
      };
    }

    await sleep(pollIntervalMs);
  }

  throw new Error('Timed out waiting for backlog normalization and zero-RPO reconciliation.');
};

const seedMeasurements = async (count, requestBatchSize) => {
  const totalCount = Math.max(1, count);
  const size = Math.max(1, requestBatchSize);
  let accepted = 0;

  for (let index = 0; index < totalCount; index += size) {
    const measurements = Array.from(
      { length: Math.min(size, totalCount - index) },
      (_, batchIndex) => {
        const absoluteIndex = index + batchIndex;
        return {
          deviceUid: `chaos-sensor-${absoluteIndex % 10}`,
          measuredAt: new Date(Date.now() - absoluteIndex * 1000).toISOString(),
          fillLevelPercent: 40 + (absoluteIndex % 40),
          measurementQuality: 'valid',
        };
      },
    );
    const body = JSON.stringify({ measurements });
    const response = await fetchJson(`${apiBaseUrl}/iot/v1/measurements/batch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body,
    });
    accepted += Number(response.accepted ?? 0);
  }

  return accepted;
};

const seedStaleLease = async (dockerEnv) => {
  const output = await runPsql(
    `
      WITH candidate AS (
        SELECT id
        FROM iot.validated_event_deliveries
        WHERE processing_status <> 'processing'
        ORDER BY updated_at DESC
        LIMIT 1
      )
      UPDATE iot.validated_event_deliveries
      SET
        processing_status = 'processing',
        processing_started_at = NOW() - INTERVAL '10 minutes',
        claimed_by_instance_id = 'chaos-stale-lease',
        updated_at = NOW()
      WHERE id IN (SELECT id FROM candidate)
      RETURNING id
    `,
    dockerEnv,
  );

  return output || null;
};

const seedFailedDelivery = async (dockerEnv) => {
  const output = await runPsql(
    `
      WITH candidate AS (
        SELECT id
        FROM iot.validated_event_deliveries
        WHERE consumer_name = 'timeseries_projection'
        ORDER BY updated_at DESC
        LIMIT 1
      )
      UPDATE iot.validated_event_deliveries
      SET
        processing_status = 'failed',
        attempt_count = 3,
        next_attempt_at = NOW(),
        claimed_by_instance_id = NULL,
        failed_at = NOW(),
        last_error = 'Chaos retry exhaustion seed',
        updated_at = NOW()
      WHERE id IN (SELECT id FROM candidate)
      RETURNING id
    `,
    dockerEnv,
  );

  return output || null;
};

const waitForDeliveryStatus = async (dockerEnv, deliveryId, expectedStatuses) => {
  const startedAt = Date.now();
  const acceptableStatuses = new Set(
    Array.isArray(expectedStatuses) ? expectedStatuses : [expectedStatuses],
  );

  while (Date.now() - startedAt < timeoutMs) {
    const status = await runPsql(
      `SELECT processing_status FROM iot.validated_event_deliveries WHERE id = '${deliveryId}'`,
      dockerEnv,
    );
    if (acceptableStatuses.has(status)) {
      return {
        recoveryMs: Date.now() - startedAt,
        finalStatus: status,
      };
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `Timed out waiting for delivery ${deliveryId} to reach one of ${[...acceptableStatuses].join(', ')}.`,
  );
};

const replayFailedDelivery = async (deliveryId) => {
  assert(adminToken, 'Replay scenario requires --admin-token so the admin replay endpoint can be exercised.');

  await fetchJson(`${apiBaseUrl}/admin/event-workflow/replay/deliveries`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${adminToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      deliveryIds: [deliveryId],
      reason: 'chaos harness replay recovery',
    }),
  });
};

const formatJson = (value) => `\`${JSON.stringify(value)}\``;

const runScenario = async (scenarioName, dockerEnv, baselineMetrics, baselineDb) => {
  const startedAt = new Date().toISOString();

  if (dryRun) {
    return {
      scenarioName,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'skipped',
      notes: ['Dry-run mode: no containers or database state were changed.'],
      baselineMetrics,
      baselineDb,
      finalMetrics: baselineMetrics,
      finalDb: baselineDb,
      rpoGap: computeRpoGap(baselineDb),
      rtoMs: 0,
    };
  }

  if (scenarioName === 'api-restart') {
    await runDockerCompose(['stop', 'backend']);
    await sleep(outageMs);
    await runDockerCompose(['start', 'backend']);
    await waitForApiReadiness();
    const normalized = await waitForBacklogNormalization(dockerEnv, baselineMetrics);

    return {
      scenarioName,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'passed',
      notes: ['Backend container restarted during active pipeline load.'],
      baselineMetrics,
      baselineDb,
      finalMetrics: normalized.metricsSnapshot,
      finalDb: normalized.dbSnapshot,
      rpoGap: normalized.rpoGap,
      rtoMs: normalized.rtoMs,
    };
  }

  if (scenarioName === 'db-outage') {
    await runDockerCompose(['stop', 'db']);
    await sleep(outageMs);
    await runDockerCompose(['start', 'db']);
    await waitForApiReadiness();
    const normalized = await waitForBacklogNormalization(dockerEnv, baselineMetrics);

    return {
      scenarioName,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'passed',
      notes: ['Database container restarted to force queue retries and lease recovery.'],
      baselineMetrics,
      baselineDb,
      finalMetrics: normalized.metricsSnapshot,
      finalDb: normalized.dbSnapshot,
      rpoGap: normalized.rpoGap,
      rtoMs: normalized.rtoMs,
    };
  }

  if (scenarioName === 'stale-lease') {
    const deliveryId = await seedStaleLease(dockerEnv);
    assert(deliveryId, 'No validated-event delivery was available for stale-lease seeding.');
    const recovery = await waitForDeliveryStatus(dockerEnv, deliveryId, ['retry', 'completed']);
    const [finalMetrics, finalDb] = await Promise.all([
      getMetricsSnapshot(),
      getDbSnapshot(dockerEnv),
    ]);

    return {
      scenarioName,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'passed',
      notes: [
        `Seeded delivery ${deliveryId} with a stale processing lease and observed automatic recovery to ${recovery.finalStatus}.`,
      ],
      baselineMetrics,
      baselineDb,
      finalMetrics,
      finalDb,
      rpoGap: computeRpoGap(finalDb),
      rtoMs: recovery.recoveryMs,
    };
  }

  if (scenarioName === 'replay-recovery') {
    const deliveryId = await seedFailedDelivery(dockerEnv);
    assert(deliveryId, 'No delivery was available for failed-delivery replay seeding.');

    if (!adminToken) {
      const [finalMetrics, finalDb] = await Promise.all([
        getMetricsSnapshot(),
        getDbSnapshot(dockerEnv),
      ]);

      return {
        scenarioName,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: 'skipped',
        notes: [
          `Seeded delivery ${deliveryId} into a failed state to represent retry exhaustion.`,
          'Replay was skipped because --admin-token was not provided.',
        ],
        baselineMetrics,
        baselineDb,
        finalMetrics,
        finalDb,
        rpoGap: computeRpoGap(finalDb),
        rtoMs: 0,
      };
    }

    await replayFailedDelivery(deliveryId);
    const recovery = await waitForDeliveryStatus(dockerEnv, deliveryId, 'completed');
    const [finalMetrics, finalDb] = await Promise.all([
      getMetricsSnapshot(),
      getDbSnapshot(dockerEnv),
    ]);

    return {
      scenarioName,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'passed',
      notes: [
        `Seeded delivery ${deliveryId} into a failed state to represent retry exhaustion.`,
        'Replayed the failed delivery through the admin replay endpoint.',
      ],
      baselineMetrics,
      baselineDb,
      finalMetrics,
      finalDb,
      rpoGap: computeRpoGap(finalDb),
      rtoMs: recovery.recoveryMs,
    };
  }

  throw new Error(`Unsupported scenario '${scenarioName}'.`);
};

const renderReport = (acceptedMeasurements, scenarioResults) => {
  const lines = [
    '# IoT Chaos Harness Report',
    '',
    `Generated at: ${new Date().toISOString()}`,
    `Seeded measurements: ${acceptedMeasurements}`,
    `API base URL: ${apiBaseUrl}`,
    `API transport: ${apiTransport}`,
    '',
  ];

  for (const result of scenarioResults) {
    lines.push(`## ${result.scenarioName}`);
    lines.push(`- Status: ${result.status}`);
    lines.push(`- Started: ${result.startedAt}`);
    lines.push(`- Finished: ${result.finishedAt}`);
    lines.push(`- RTO ms: ${result.rtoMs}`);
    lines.push(
      `- RPO gap: timeseries=${result.rpoGap.timeseries}, rollups=${result.rpoGap.rollups}, rollupRows=${result.rpoGap.rollupRows}`,
    );
    lines.push(`- Baseline metrics: ${formatJson(result.baselineMetrics)}`);
    lines.push(`- Final metrics: ${formatJson(result.finalMetrics)}`);
    lines.push(`- Baseline DB snapshot: ${formatJson(result.baselineDb)}`);
    lines.push(`- Final DB snapshot: ${formatJson(result.finalDb)}`);
    if (result.notes.length > 0) {
      lines.push('- Notes:');
      for (const note of result.notes) {
        lines.push(`  - ${note}`);
      }
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
};

const main = async () => {
  assert(await readFile(dockerEnvFile, 'utf8').then(() => true).catch(() => false), `Missing ${dockerEnvFile}.`);
  assert(scenarios.every((scenario) => supportedScenarios.has(scenario)), `Unsupported scenario list: ${scenarios.join(', ')}`);
  assert(supportedApiTransports.has(apiTransport), `Unsupported api transport '${apiTransport}'.`);

  const dockerEnv = await parseEnvFile(dockerEnvFile);
  assert(dockerEnv.POSTGRES_USER, 'POSTGRES_USER must be present in infrastructure/environments/.env.docker.');
  assert(dockerEnv.POSTGRES_DB, 'POSTGRES_DB must be present in infrastructure/environments/.env.docker.');

  await waitForApiReadiness();

  const acceptedMeasurements = skipSeed ? 0 : await seedMeasurements(measurementCount, batchSize);
  await sleep(pollIntervalMs);

  const scenarioResults = [];

  for (const scenarioName of scenarios) {
    const [baselineMetrics, baselineDb] = await Promise.all([
      getMetricsSnapshot(),
      getDbSnapshot(dockerEnv),
    ]);
    scenarioResults.push(await runScenario(scenarioName, dockerEnv, baselineMetrics, baselineDb));
  }

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderReport(acceptedMeasurements, scenarioResults), 'utf8');

  console.log(`Chaos report written to ${reportPath}`);
  for (const result of scenarioResults) {
    console.log(
      `${result.scenarioName}: ${result.status} (RTO ${result.rtoMs} ms, RPO gaps ${JSON.stringify(result.rpoGap)})`,
    );
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
