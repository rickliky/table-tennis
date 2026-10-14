# Training Match Import

In Data Maintenance → Import, paste CSV/TSV or upload a UTF-8 file. Preview and
resolve all blocked rows before submitting the normal grouped approval request.
This format update is UAT-only until a separately approved production promotion.

```csv
matchDate,player1,player1Sets,player2,player2Sets,division,matchFormat,player1Name,player2Name
10/3/2026,LK-0093,3,LK-0001,1,Open,'Best of 5',岡田,三田村
```

- `player1`, `player1Sets`, `player2`, `player2Sets` are required headers.
  `player1`/`player2` resolve canonical IDs first; explicit names/aliases remain
  supported, with ambiguous or unknown input requiring manual resolution.
- **`player1Name` and `player2Name` are optional, ignored reference columns.**
  They can appear anywhere, be blank, be wrong, or be omitted. They never resolve
  a missing player, overwrite a system name, affect the resolved batch hash, or
  enter submission/issue-export payloads. Saved name snapshots always come from
  approved player records. Name-only reference headers do not replace the required
  `player1`/`player2` headers.
- Dates accept `YYYY-MM-DD` or **M/D/YYYY**: `10/3/2026` means **October 3, 2026**,
  not March 10. Storage and hashing use `2026-10-03`. Set the Session date control
  to the same date; invalid calendar dates or mismatched dates remain blocked.
  If the date column is omitted/blank, the selected session date is used.
- `matchFormat` accepts `Best of 5`, `Best of 3`, or `Short practice`, optionally
  enclosed in matching single/double quotes. An omitted/blank value uses the
  selected session format. The three-set completion rule is unchanged.
- CSV double-quoted cells can contain commas; TSV uses tabs. Optional reference
  cells still follow the normal CSV/TSV structural quoting rules.
- Preview alone writes nothing. Existing duplicate detection, repeat-safe batch
  IDs, incomplete-score warnings, and approval safeguards remain unchanged.

The downloadable template uses the example above. Tests use synthetic approved
records and intercepted submissions only; this example is not an authorized
request to import an actual match. Release results are recorded in `AGENTS.md`.

UAT release **`4b5e90e`**, Actions **`38580250951`**, passed all verification
suites, **46 browser tests** and **17 live checks without retry**. Import checks
cover JA/EN at 320/1440 px with mocked Admin/data and zero actual writes; mobile
screenshots were visually reviewed. Input/preview panels fit the viewport, and
the wide results table scrolls internally. Production remains `baacdb0`; no
matches, sessions, imports or private notebooks were modified.
