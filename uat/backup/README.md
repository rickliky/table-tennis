# Offline-Only Backups

These files are **not used at runtime** and **not used as fallback**.

Golden source of all data: **Upstash Redis** via Cloudflare Worker API
(`https://little-kings-api.little-kings.workers.dev`).

These backups exist solely for:
- Offline reference and audit
- Disaster recovery (manual restore)
- Historical snapshots

## Structure

```
backup/
├── uat/          # UAT environment snapshots
│   ├── players.json.2026-09-18
│   ├── training-matches.json.2026-09-18
│   └── ...
└── prod/         # Production environment snapshots
    ├── players.json.2026-09-18
    ├── training-matches.json.2026-09-18
    └── ...
```

## Generating fresh backups

Run the export script to snapshot current Upstash data:

```bash
node scripts/export-from-upstash.js uat    # backup/uat/
node scripts/export-from-upstash.js prod   # backup/prod/
```

This creates new `*.json.YYYY-MM-DD` files in the appropriate directory.
