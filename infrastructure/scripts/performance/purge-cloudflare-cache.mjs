#!/usr/bin/env node

const parseArgs = (argv) => {
  const options = {
    everything: false,
    files: [],
    tags: [],
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--everything') {
      options.everything = true;
      continue;
    }

    if (token === '--files') {
      options.files = (argv[++index] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      continue;
    }

    if (token === '--tags') {
      options.tags = (argv[++index] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }

  return options;
};

const options = parseArgs(process.argv);
const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();

if (!apiToken || !zoneId) {
  throw new Error('Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID before purging cache.');
}

if (!options.everything && options.files.length === 0 && options.tags.length === 0) {
  throw new Error('Pass --everything, --files, or --tags.');
}

const body = options.everything
  ? { purge_everything: true }
  : {
      ...(options.files.length > 0 ? { files: options.files } : {}),
      ...(options.tags.length > 0 ? { tags: options.tags } : {}),
    };

const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const payload = await response.json();
if (!response.ok || payload?.success !== true) {
  console.error(JSON.stringify(payload, null, 2));
  throw new Error(`Cloudflare purge failed with status ${response.status}.`);
}

console.log(JSON.stringify(payload, null, 2));
