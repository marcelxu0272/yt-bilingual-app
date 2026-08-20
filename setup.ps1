[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$previousLocation = Get-Location

function Assert-LastExitCode {
    param([string]$Step)

    if ($LASTEXITCODE -ne 0) {
        throw "$Step failed with exit code $LASTEXITCODE."
    }
}

try {
    Set-Location $scriptRoot

    Write-Host "====================================="
    Write-Host "Lingua Nova Windows Setup"
    Write-Host "====================================="

    $pythonCommand = Get-Command py -ErrorAction SilentlyContinue
    $pythonArgs = @("-3")
    if (-not $pythonCommand) {
        $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
        $pythonArgs = @()
    }
    if (-not $pythonCommand) {
        throw "Python was not found. Install Python 3.10 or later first."
    }
    $pythonExecutable = $pythonCommand.Source

    $pythonVersionArgs = $pythonArgs + @("-c", "import sys; print('.'.join(map(str, sys.version_info[:3])))")
    $pythonVersionText = & $pythonExecutable $pythonVersionArgs
    Assert-LastExitCode "Python version check"
    $pythonVersion = [version]$pythonVersionText.Trim()
    if ($pythonVersion -lt [version]"3.10") {
        throw "Python $pythonVersion was found. Python 3.10 or later is required."
    }
    Write-Host "Python: $pythonVersion"

    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npmCommand) {
        $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    }
    if (-not $nodeCommand -or -not $npmCommand) {
        throw "Node.js or npm was not found. Install Node.js 18 or later first."
    }
    $nodeExecutable = $nodeCommand.Source
    $npmExecutable = $npmCommand.Source

    $nodeVersionText = (& $nodeExecutable --version).Trim().TrimStart("v")
    Assert-LastExitCode "Node.js version check"
    $nodeMajor = [int]($nodeVersionText.Split(".")[0])
    if ($nodeMajor -lt 18) {
        throw "Node.js $nodeVersionText was found. Node.js 18 or later is required."
    }
    Write-Host "Node.js: $nodeVersionText"

    Write-Host ""
    Write-Host "[1/3] Setting up the Python backend..."
    $venvDirectory = Join-Path $scriptRoot "backend\venv"
    $venvPython = Join-Path $venvDirectory "Scripts\python.exe"
    if (-not (Test-Path -LiteralPath $venvPython)) {
        $createVenvArgs = $pythonArgs + @("-m", "venv", $venvDirectory)
        & $pythonExecutable $createVenvArgs
        Assert-LastExitCode "Python virtual environment creation"
    }
    & $venvPython -m pip install -r (Join-Path $scriptRoot "backend\requirements.txt")
    Assert-LastExitCode "Python dependency installation"

    Write-Host ""
    Write-Host "[2/3] Setting up the frontend..."
    Push-Location (Join-Path $scriptRoot "frontend")
    try {
        & $npmExecutable install
        Assert-LastExitCode "Frontend dependency installation"
    }
    finally {
        Pop-Location
    }

    Write-Host ""
    Write-Host "[3/3] Checking configuration..."
    $envPath = Join-Path $scriptRoot ".env"
    if (-not (Test-Path -LiteralPath $envPath)) {
        Copy-Item -LiteralPath (Join-Path $scriptRoot ".env.example") -Destination $envPath
        Write-Host "Created .env from .env.example. Add your DEEPSEEK_API_KEY."
    }
    else {
        Write-Host ".env already exists and was not changed."
    }

    Write-Host ""
    Write-Host "Setup complete. Run .\start_app.ps1 to start the app."
}
finally {
    Set-Location $previousLocation
}
