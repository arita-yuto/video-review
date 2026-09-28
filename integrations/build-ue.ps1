# Builds the Unreal Engine plugin for Win64, to catch breakage before a release.
# Usage: powershell -ExecutionPolicy Bypass -File integrations\build-ue.ps1 [-Unreal <engine folder, e.g. C:\Program Files\Epic Games\UE_5.7>]
param(
    [string]$Unreal
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Work = Join-Path $env:TEMP "videoreview-build-ue"

# The newest engine from the Epic Games Launcher, unless one is given.
if (-not $Unreal) {
    $Unreal = (Get-ChildItem "C:\Program Files\Epic Games" -Directory -Filter "UE_*" | Sort-Object Name | Select-Object -Last 1).FullName
}

# Built from a local copy: UAT does not handle a network path (a WSL checkout is one).
Remove-Item $Work -Recurse -Force -ErrorAction SilentlyContinue
$src = Join-Path $Work "src"
New-Item $src -ItemType Directory | Out-Null
Copy-Item (Join-Path $Root "ue\Plugins\VideoReview") $src -Recurse

Write-Host "== Unreal: $Unreal =="
$log = Join-Path $Work "ue.log"
# RunUAT.bat runs in cmd.exe, which refuses a network path as its working directory.
Push-Location $Work
# UAT writes progress to stderr, which Windows PowerShell would otherwise raise as an error.
$ErrorActionPreference = "Continue"
& (Join-Path $Unreal "Engine\Build\BatchFiles\RunUAT.bat") BuildPlugin `
    "-Plugin=$src\VideoReview\VideoReview.uplugin" "-Package=$Work\out" -TargetPlatforms=Win64 -Rocket *> $log
$code = $LASTEXITCODE
Pop-Location

if ($code -ne 0) {
    Write-Host "FAILED (see $log)"
    Select-String -Path $log -Pattern "error" | Select-Object -First 20 | ForEach-Object { $_.Line }
    exit 1
}
Write-Host "OK"
