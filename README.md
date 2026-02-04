# Driver Breaks Compliance Checker

A small TypeScript backend project that checks driver schedules for compliance with EU Regulation (EC) No 561/2006, Article 7 (breaks). The core logic lives in `BreaksComplianceChecker` and is tested with Vitest. The regulation text is available here: https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32006R0561

## Features
- Article 7 breaks compliance checker
- Horizon schedule support (multiple days)
- Unit tests using Vitest with Chai-style assertions

## Article 7 Rules (Breaks)
After a driving period of four and a half hours a driver shall take an uninterrupted break of not less than 45 minutes, unless he takes a rest period.

This break may be replaced by a break of at least 15 minutes followed by a break of at least 30 minutes each distributed over the period in such a way as to comply with the provisions of the first paragraph.

## Project Structure
- `src/BreaksComplianceChecker.ts` — Article 7 compliance logic
- `src/models.ts` — shared domain models (schedules, infringements)
- `src/ComplianceChecker.ts` — interface for compliance checkers
- `src/index.ts` — minimal HTTP server entrypoint
- `src/BreaksComplianceChecker.test.ts` — unit tests

## Getting Started
### Install dependencies
```bash
npm install
```

### Run tests
```bash
npm test
```

## Notes
- Development uses `vite-node` for fast TypeScript execution.
- The production build uses Vite SSR output targeting Node.

## License
MIT
