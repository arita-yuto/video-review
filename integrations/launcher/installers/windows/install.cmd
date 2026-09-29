@echo off
rem Runs the installer past the execution policy, which blocks unsigned scripts unpacked from a downloaded zip.
if not exist "%~dp0scripts\install.ps1" (
    rem Opened from inside the zip, where Explorer extracts only this file.
    echo Unpack the zip first, then run install.cmd from the unpacked folder.
    pause
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1"
