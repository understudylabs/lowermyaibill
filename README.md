<h1 align="center">Lower My AI Bill</h1>

<p align="center">
  Find the Claude routes costing you money with a local code scan.
</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT licensed" src="https://img.shields.io/badge/license-MIT-d66f52?style=flat-square"></a>
  <img alt="Zero runtime dependencies" src="https://img.shields.io/badge/runtime_dependencies-0-8bd4b6?style=flat-square">
  <img alt="Built for Claude Code" src="https://img.shields.io/badge/agent-Claude_Code-f1c27d?style=flat-square">
</p>

## Run it

From the repository you want to audit:

```sh
curl -fsSL https://raw.githubusercontent.com/UnderstudyLabs/lowermyaibill/main/install.sh | bash
```

The installer adds the LMAB plugin for Claude Code and starts an audit in the current repository. The scan and report stay local under `.lmab/`.

## What you get

| Static scan | Ranked opportunities | Local report |
| --- | --- | --- |
| Groups Anthropic call sites into route cards with model, cache, token, thinking, retry, batch, tool, and output facts. | Prioritizes the code signals most likely to reduce Anthropic spend and cites their file and line. | Writes a portable HTML report, deterministic scan ledger, and static share card under `.lmab/`. |

## Code only

Code can show where to look. It cannot prove a savings percentage.

LMAB reads repository files. It does not search email, Drive, billing dashboards, connected integrations, telemetry, or traces. It does not ask for provider credentials.

Every recommendation is a static code finding that requires measurement before anyone claims realized savings. The audit does not upload source, edit application code, or require an Understudy account. Claude Code itself uses your existing Claude connection.

## Files it writes

| Artifact | Purpose |
| --- | --- |
| `.lmab/report.html` | Portable audit report you can open locally |
| `.lmab/scan.json` | Deterministic code-scan findings |
| `.lmab/share-card.svg` | Static card for sharing the result |

`.lmab/` is ignored by the installer so audit artifacts do not land in commits by accident.

## Help us test it

We are looking for a small first group of teams with Anthropic code in production. Run LMAB on one repository, inspect the report, and [tell us what was useful, wrong, or confusing](https://github.com/UnderstudyLabs/lowermyaibill/issues/new?template=audit-feedback.yml&title=Audit%20feedback%3A%20).

Do not attach source code, prompts, account identifiers, or the generated `.lmab/` directory to a public issue. A description of the finding is enough.

## Uninstall

```sh
curl -fsSL https://raw.githubusercontent.com/UnderstudyLabs/lowermyaibill/main/install.sh | bash -s -- --uninstall
```

<details>
<summary>Local development</summary>

```sh
node bin/lmab audit /path/to/repo
npm test
claude plugin validate .
```

</details>

MIT licensed. Anthropic and Claude are trademarks of their respective owners. This independent project is not affiliated with or endorsed by Anthropic.
