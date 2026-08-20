[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDirectory = Join-Path $scriptRoot "backend"
$frontendDirectory = Join-Path $scriptRoot "frontend"
$venvPython = Join-Path $backendDirectory "venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $venvPython)) {
    throw "The Windows Python virtual environment was not found. Run .\setup.ps1 first."
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
}
if (-not $npmCommand) {
    throw "npm was not found. Install Node.js 18 or later first."
}
$npmExecutable = $npmCommand.Source

$backendProcess = $null
$frontendProcess = $null

function Assert-PortAvailable {
    param([int]$Port)

    $listeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    if ($listeners.Port -contains $Port) {
        throw "Port $Port is already in use. Stop that process and try again."
    }
}

function Stop-ProcessTree {
    param([System.Diagnostics.Process]$Process)

    if ($null -ne $Process -and -not $Process.HasExited) {
        try {
            & taskkill.exe /PID $Process.Id /T /F 2>$null | Out-Null
        }
        catch {
            Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        }
    }
}

try {
    Write-Host "====================================="
    Write-Host "Starting Lingua Nova..."
    Write-Host "====================================="

    Assert-PortAvailable 8000
    Assert-PortAvailable 5173

    $backendProcess = Start-Process `
        -FilePath $venvPython `
        -ArgumentList @("-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000") `
        -WorkingDirectory $backendDirectory `
        -NoNewWindow `
        -PassThru

    $frontendProcess = Start-Process `
        -FilePath $npmExecutable `
        -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--strictPort") `
        -WorkingDirectory $frontendDirectory `
        -NoNewWindow `
        -PassThru

    Write-Host ""
    Write-Host "App URL: http://localhost:5173"
    Write-Host "Press Ctrl+C to stop the backend and frontend."

    while (-not $backendProcess.HasExited -and -not $frontendProcess.HasExited) {
        Start-Sleep -Milliseconds 500
        $backendProcess.Refresh()
        $frontendProcess.Refresh()
    }

    if ($backendProcess.HasExited) {
        $backendProcess.WaitForExit()
        throw "The backend exited with code $($backendProcess.ExitCode)."
    }
    $frontendProcess.WaitForExit()
    throw "The frontend exited with code $($frontendProcess.ExitCode)."
}
finally {
    Stop-ProcessTree $frontendProcess
    Stop-ProcessTree $backendProcess
}
