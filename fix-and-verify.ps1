$ErrorActionPreference = 'Stop'

Write-Host 'Formatting project...'
npm run format

Write-Host 'Running quality gates...'
npm run format:check
npm run lint
npm run check
npm run test
npm run build
npm run test:e2e

Write-Host 'All quality gates passed.' -ForegroundColor Green
