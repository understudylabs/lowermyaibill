# Lower My AI Bill

Lower My AI Bill is a small, readable Claude Code plugin that audits a repository for the largest Anthropic cost-saving opportunities and writes a local HTML report.

```bash
curl -fsSL https://raw.githubusercontent.com/UnderstudyLabs/lowermyaibill/main/install.sh | bash
```

The audit starts locally, uses already-connected integrations only for narrow read-only Anthropic billing evidence, and writes everything under `.lmab/`. It does not upload source, call a model provider, change production code, or require an Understudy account.

## Local development

```bash
node bin/lmab audit /path/to/repo
npm test
claude plugin validate .
```

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/UnderstudyLabs/lowermyaibill/main/install.sh | bash -s -- --uninstall
```

MIT licensed. Anthropic and Claude are trademarks of their respective owners. This project is independent and is not affiliated with or endorsed by Anthropic.
