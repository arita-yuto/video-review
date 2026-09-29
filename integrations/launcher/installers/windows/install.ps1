$ErrorActionPreference = "Stop"

# --------------------------------------------------
# paths
# --------------------------------------------------
$ScriptDir = Resolve-Path $PSScriptRoot
$RootDir   = Resolve-Path (Join-Path $ScriptDir "..\..")

# --------------------------------------------------
# config
# --------------------------------------------------
$BinName = "videoreview-launcher.exe"
$AppName = "VideoReview Launcher"

$BinPath = Join-Path $ScriptDir $BinName
$InstallBase = Join-Path $env:LOCALAPPDATA "VideoReview"
$AppDir = Join-Path $InstallBase $AppName

# --------------------------------------------------
# install
# --------------------------------------------------
Write-Host "== Install VideoReview Launcher (Windows) =="

# "Run with PowerShell" closes the window as soon as the script ends, so report the result and wait.
$Succeeded = $false
try {
    # Check prerequisites
    Write-Host "Checking prerequisites..."

    if (!(Test-Path $BinPath)) {
        Write-Error "binary not found: $BinPath"
    }

    # Create install directory
    Write-Host "Creating install directory..."

    New-Item -ItemType Directory -Force -Path $AppDir | Out-Null
    Copy-Item $BinPath (Join-Path $AppDir $BinName) -Force

    # Register URL scheme
    Write-Host "Registering URL scheme (videoreview://)..."

    $ExePath = Join-Path $AppDir $BinName

    New-Item -Path "HKCU:\Software\Classes\videoreview" -Force | Out-Null
    Set-ItemProperty "HKCU:\Software\Classes\videoreview" -Name "(Default)" -Value "URL:VideoReview Protocol"
    Set-ItemProperty "HKCU:\Software\Classes\videoreview" -Name "URL Protocol" -Value ""

    New-Item -Path "HKCU:\Software\Classes\videoreview\shell\open\command" -Force | Out-Null
    Set-ItemProperty `
        "HKCU:\Software\Classes\videoreview\shell\open\command" `
        -Name "(Default)" `
        -Value "`"$ExePath`" `"%1`""

    Write-Host "Installed to: $AppDir"

    $Succeeded = $true
} catch {
    Write-Host ""
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
}

if ($Succeeded) {
    Write-Host ""
    Write-Host "Success" -ForegroundColor Green
}

Read-Host "Press Enter to close" | Out-Null

if (!$Succeeded) {
    exit 1
}
