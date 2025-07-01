#!/bin/bash

# Callivate Backend Setup Script
# Sets up development environment for the FastAPI backend

set -e  # Exit on any error

echo "🚀 Setting up Callivate Backend Development Environment..."

# Check Python version
echo "📋 Checking Python version..."
python_version=$(python3 --version 2>&1 | grep -o '[0-9]\+\.[0-9]\+' | head -1)
required_version="3.9"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Python 3.9 or higher is required. Found: $python_version"
    exit 1
fi
echo "✅ Python version: $python_version"

# Create virtual environment
echo "🔧 Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
echo "⚙️ Setting up environment variables..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "🔧 Please edit .env with your actual values"
else
    echo "✅ .env file already exists"
fi

# Check if required environment variables are set
echo "🔍 Checking environment configuration..."
if [ -f ".env" ]; then
    # Source the .env file
    set -a
    source .env
    set +a
    
    # Check required variables
    missing_vars=()
    
    if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "your-supabase-project-url" ]; then
        missing_vars+=("SUPABASE_URL")
    fi
    
    if [ -z "$SUPABASE_KEY" ] || [ "$SUPABASE_KEY" = "your-supabase-anon-key" ]; then
        missing_vars+=("SUPABASE_KEY")
    fi
    
    if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your-gemini-api-key" ]; then
        missing_vars+=("GEMINI_API_KEY")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        echo "⚠️  Warning: The following required environment variables need to be set:"
        printf '%s\n' "${missing_vars[@]}"
        echo "   Please update your .env file with actual values"
    else
        echo "✅ All required environment variables are configured"
    fi
fi

# Test database connection (optional)
echo "🗄️ Testing database connection..."
python3 -c "
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
" || echo "⚠️  Could not test database connection - please verify your settings"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the development server:"
echo "  1. Activate virtual environment: source venv/bin/activate"
echo "  2. Run the server: uvicorn main:app --reload"
echo "  3. Visit: http://localhost:8000/docs"
echo ""
echo "Next steps:"
echo "  - Update .env with your actual API keys"
echo "  - Test database connection"
echo "  - Review API documentation at /docs"
echo "" 