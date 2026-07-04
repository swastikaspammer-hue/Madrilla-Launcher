@echo off
title Madrilla Launcher Setup
echo Setting up Madrilla Launcher...

:: Create Start Menu Shortcut
powershell -NoProfile -ExecutionPolicy Bypass -Command "$WshShell = New-Object -ComObject WScript.Shell; $StartMenu = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs'); $Shortcut = $WshShell.CreateShortcut(\"$StartMenu\Madrilla Launcher.lnk\"); $Shortcut.TargetPath = \"$PSScriptRoot\bin\MadrillaLauncher.exe\"; $Shortcut.WorkingDirectory = \"$PSScriptRoot\bin\"; $Shortcut.Save()"

:: Create Desktop Shortcut
powershell -NoProfile -ExecutionPolicy Bypass -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut(\"$Home\Desktop\Madrilla Launcher.lnk\"); $Shortcut.TargetPath = \"$PSScriptRoot\bin\MadrillaLauncher.exe\"; $Shortcut.WorkingDirectory = \"$PSScriptRoot\bin\"; $Shortcut.Save()"

echo.
echo ===================================================
echo Setup complete! 
echo Shortcuts created on your Desktop and Start Menu.
echo ===================================================
echo.
pause
