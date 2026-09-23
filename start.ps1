$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw 'Node.js 20.9 이상을 설치한 뒤 다시 실행해 주세요.' }
if (-not (Test-Path -LiteralPath 'node_modules/next/dist/bin/next')) {
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npmCommand) { & $npmCommand.Source install }
    else {
        $runtimePnpm = Join-Path (Split-Path (Split-Path $nodeCommand.Source)) 'node_modules/pnpm/bin/pnpm.cjs'
        if (-not (Test-Path -LiteralPath $runtimePnpm)) { throw 'npm 또는 pnpm으로 의존성을 먼저 설치해 주세요.' }
        & $nodeCommand.Source $runtimePnpm install --frozen-lockfile
    }
    if ($LASTEXITCODE -ne 0) { throw '의존성 설치에 실패했습니다.' }
}
& $nodeCommand.Source 'node_modules/next/dist/bin/next' dev --hostname 127.0.0.1
