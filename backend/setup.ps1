# Callivate Backend Setup Script for Windows
# Sets up development environment for the FastAPI backend

Write-Host "🚀 Setting up Callivate Backend Development Environment..." -ForegroundColor Green

# Check Python version
Write-Host "📋 Checking Python version..." -ForegroundColor Cyan
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python (\d+\.\d+)") {
        $version = [version]$matches[1]
        $requiredVersion = [version]"3.9"
        
        if ($version -lt $requiredVersion) {
            Write-Host "❌ Python 3.9 or higher is required. Found: $($version)" -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ Python version: $($version)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Python not found. Please install Python 3.9 or higher." -ForegroundColor Red
    exit 1
}

# Create virtual environment
Write-Host "🔧 Creating virtual environment..." -ForegroundColor Cyan
if (-not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "✅ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "✅ Virtual environment already exists" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Cyan
& ".\venv\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "📦 Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip

# Install dependencies with conflict resolution
Write-Host "📦 Installing Python dependencies..." -ForegroundColor Cyan
Write-Host "🔧 Resolving dependency conflicts..." -ForegroundColor Yellow

try {
    # First, try to install with updated requirements
    pip install -r requirements.txt
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Dependency conflict detected. Attempting resolution..." -ForegroundColor Yellow
    
    # Install core dependencies first
    pip install "fastapi>=0.104.1,<1.0.0" "uvicorn[standard]>=0.24.0,<1.0.0"
    pip install "pydantic>=2.5.1,<3.0.0" "pydantic-settings>=2.1.0,<3.0.0"
    
    # Install supabase with compatible httpx
    pip install "supabase>=2.16.0,<3.0.0"
    
    # Install remaining dependencies
    pip install -r requirements.txt --no-deps
    
    Write-Host "✅ Dependencies resolved and installed" -ForegroundColor Green
}

# Create .env file if it doesn't exist
Write-Host "⚙️ Setting up environment variables..." -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Created .env file from template" -ForegroundColor Green
        Write-Host "🔧 Please edit .env with your actual values" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️ .env.example not found. Please create .env manually" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Test database connection (optional)
Write-Host "🗄️ Testing database connection..." -ForegroundColor Cyan
try {
    python -c @"
import asyncio
from app.core.database import create_tables
async def test():
    try:
        await create_tables()
        print('✅ Database connection successful')
    except Exception as e:
        print(f'⚠️  Database connection failed: {e}')
        print('   Please check your SUPABASE_URL and DATABASE_URL settings')

asyncio.run(test())
"@
} catch {
    Write-Host "⚠️ Could not test database connection - please verify your settings" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the development server:" -ForegroundColor Cyan
Write-Host "  1. Activate virtual environment: .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  2. Run the server: uvicorn main:app --reload" -ForegroundColor White
Write-Host "  3. Visit: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  - Update .env with your actual API keys" -ForegroundColor White
Write-Host "  - Test database connection" -ForegroundColor White
Write-Host "  - Review API documentation at /docs" -ForegroundColor White
Write-Host "" 