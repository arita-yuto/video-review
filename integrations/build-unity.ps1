# Compiles the Unity plugin's scripts in batch mode, to catch breakage before a release.
# Usage: powershell -ExecutionPolicy Bypass -File integrations\build-unity.ps1 [-Unity <Unity.exe>]
param(
    [string]$Unity
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Work = Join-Path $env:TEMP "videoreview-build-unity"

# The newest editor installed through Unity Hub, unless one is given.
if (-not $Unity) {
    $editor = Get-ChildItem "C:\Program Files\Unity\Hub\Editor" -Directory | Sort-Object Name | Select-Object -Last 1
    $Unity = Join-Path $editor.FullName "Editor\Unity.exe"
}

# Unity cannot open a project on a network path (a WSL checkout is one), and opening it writes Library/.
Remove-Item $Work -Recurse -Force -ErrorAction SilentlyContinue
$project = Join-Path $Work "project"
New-Item $project -ItemType Directory | Out-Null
foreach ($dir in "Assets", "Packages", "ProjectSettings") {
    Copy-Item (Join-Path $Root "unity\VideoReviewUnity\$dir") $project -Recurse
}

Write-Host "== Unity: $Unity =="
$log = Join-Path $Work "unity.log"
$proc = Start-Process $Unity -ArgumentList "-batchmode", "-quit", "-nographics", "-projectPath", "`"$project`"", "-logFile", "`"$log`"" -Wait -PassThru

if ($proc.ExitCode -ne 0) {
    Write-Host "FAILED (see $log)"
    $errors = Select-String -Path $log -Pattern "error CS" | Select-Object -First 20 | ForEach-Object { $_.Line }
    # No compile error means Unity stopped before compiling (a licence, a locked project); its last lines say why.
    if ($errors) { $errors } else { Get-Content $log -Tail 3 }
    exit 1
}
Write-Host "OK"
