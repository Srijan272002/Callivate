# Callivate FastAPI Backend

Voice-first productivity app backend with AI-powered reminders and streak tracking.

## 🚀 Quick Start

### Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- PostgreSQL (via Supabase)
- Redis (for background tasks)

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

5. **Run the application**
   ```bash
   # Development
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # Or using Python directly
   python main.py
   ```

## 📊 API Documentation

Once running, visit:
- **Interactive API Docs (Swagger)**: http://localhost:8000/docs
- **Alternative API Docs (ReDoc)**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## 🏗️ Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── api_v1/
│   │       ├── __init__.py
│   │       ├── api.py              # Main API router
│   │       └── endpoints/          # Individual endpoint modules
│   │           ├── auth.py         # Authentication
│   │           ├── users.py        # User management
│   │           ├── tasks.py        # Task operations
│   │           ├── voices.py       # Voice management
│   │           ├── notes.py        # Notes CRUD
│   │           ├── streaks.py      # Streak tracking
│   │           ├── analytics.py    # Analytics data
│   │           ├── sync.py         # Offline sync
│   │           └── notifications.py # Push notifications
│   ├── core/
│   │   ├── config.py              # App configuration
│   │   └── database.py            # Database setup & schema
│   └── models/                    # Pydantic models
│       ├── __init__.py
│       ├── user.py
│       ├── task.py
│       ├── voice.py
│       ├── note.py
│       ├── streak.py
│       ├── analytics.py
│       ├── sync.py
│       └── notification.py
├── main.py                        # FastAPI app entry point
├── requirements.txt               # Python dependencies
├── setup.py                       # Package setup
├── .env.example                   # Environment variables template
└── README.md                      # This file
```

## 🗃️ Database Schema

### Core Tables
- **users** - User profiles (extends Supabase auth.users)
- **user_settings** - User preferences and configuration
- **voices** - Available AI voices with metadata
- **tasks** - User tasks with scheduling info
- **task_executions** - Individual task completion tracking
- **streaks** - User streak statistics
- **notes** - Rich text notes with formatting
- **analytics** - Monthly aggregated analytics
- **sync_queue** - Offline synchronization queue
- **notification_log** - Push notification tracking

### Key Features
- **Row Level Security (RLS)** enabled on all tables
- **Automatic timestamps** (created_at, updated_at)
- **UUID primary keys** for security
- **Indexed columns** for performance
- **JSONB fields** for flexible data storage

## �� Configuration

### ⚠️ IMPORTANT: Backward Compatibility Notice

**The configuration has been updated with full backward compatibility.** Both old and new environment variable names are supported:

| Feature | Old Name (Legacy) | New Name (Preferred) | Status |
|---------|-------------------|---------------------|---------|
| Supabase Auth Key | `SUPABASE_KEY` | `SUPABASE_ANON_KEY` | ✅ Both supported |
| JWT Secret | `SECRET_KEY` | `JWT_SECRET_KEY` | ✅ Both supported |
| Twilio Phone | `TWILIO_PHONE_NUMBER` | `TWILIO_FROM_PHONE` | ✅ Both supported |
| Server Host | `HOST` | `SERVER_HOST` | ✅ Both supported |
| Server Port | `PORT` | `SERVER_PORT` | ✅ Both supported |
| CORS Origins | `ALLOWED_HOSTS` | `ALLOWED_ORIGINS` | ✅ Both supported |

### Required Environment Variables (FREE SETUP)

#### Core Configuration (REQUIRED)
```env
# Database (FREE - Supabase) 
SUPABASE_URL=https://your-project-id.supabase.co

# Use EITHER new OR old names (both work):
# NEW (preferred):
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OLD (legacy, still supported):
# SUPABASE_KEY=your-supabase-anon-key

# Authentication - Use EITHER new OR old names:
# NEW (preferred):
JWT_SECRET_KEY=your-secret-key

# OLD (legacy, still supported):  
# SECRET_KEY=your-secret-key
```

#### Optional Services
```env
# AI Services (FREE - Google AI Studio)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash-exp

# Voice Calling (Optional - Twilio)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token

# Use EITHER new OR old names:
# NEW (preferred):
TWILIO_FROM_PHONE=+1234567890

# OLD (legacy, still supported):
# TWILIO_PHONE_NUMBER=+1234567890

# Voice & Notifications (FREE alternatives)
USE_BROWSER_TTS=true
USE_EXPO_NOTIFICATIONS=true
EXPO_ACCESS_TOKEN=optional-expo-token

# Background Services (NEW)
BACKGROUND_SERVICES_ENABLED=true
REALTIME_ENABLED=true
ANALYTICS_GENERATION_HOUR=2
```

### Quick Setup for Existing Users

**If you have an existing `.env` file**, it will continue to work! The system automatically:

1. ✅ **Recognizes old variable names** (`SUPABASE_KEY`, `SECRET_KEY`, `TWILIO_PHONE_NUMBER`)
2. ✅ **Provides sensible defaults** for missing optional variables
3. ✅ **Works in development mode** even with minimal configuration
4. ✅ **Supports both naming conventions** simultaneously

### Testing Your Configuration

Run the configuration test to verify everything works:

```bash
python test_config.py
```

This will test both old and new environment variable names to ensure backward compatibility.

### Migration Guide

**No migration required!** Your existing configuration will work as-is. However, for new setups, we recommend using the new variable names:

- `SUPABASE_KEY` → `SUPABASE_ANON_KEY`
- `SECRET_KEY` → `JWT_SECRET_KEY` 
- `TWILIO_PHONE_NUMBER` → `TWILIO_FROM_PHONE`

> 💡 **See `.env.example` for complete configuration options with both old and new names**

### Troubleshooting Configuration

If you encounter configuration errors:

1. **Check variable names**: Both old and new names are supported
2. **Verify required fields**: Only `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or `SUPABASE_KEY`), and `SUPABASE_SERVICE_ROLE_KEY` are required
3. **Run in debug mode**: Set `DEBUG=true` for more permissive validation
4. **Use the test script**: Run `python test_config.py` to validate your setup

## 🔗 API Endpoints

### Authentication
- `POST /api/v1/auth/google` - Google OAuth login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### Tasks
- `GET /api/v1/tasks/` - List user tasks
- `POST /api/v1/tasks/` - Create new task
- `GET /api/v1/tasks/{task_id}` - Get task details
- `PUT /api/v1/tasks/{task_id}` - Update task
- `DELETE /api/v1/tasks/{task_id}` - Delete task

### Voices
- `GET /api/v1/voices/` - List available voices
- `POST /api/v1/voices/{voice_id}/preview` - Preview voice
- `PUT /api/v1/voices/users/{user_id}/default-voice` - Set default voice

### Streaks
- `GET /api/v1/streaks/{user_id}` - Get streak data
- `GET /api/v1/streaks/{user_id}/calendar/{year}/{month}` - Monthly calendar
- `POST /api/v1/streaks/{user_id}/reset` - Reset streak

### Notes
- `GET /api/v1/notes/` - List user notes
- `POST /api/v1/notes/` - Create note
- `GET /api/v1/notes/{note_id}` - Get note
- `PUT /api/v1/notes/{note_id}` - Update note
- `DELETE /api/v1/notes/{note_id}` - Delete note

## 🧪 Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black .
isort .
```

### Type Checking
```bash
mypy app/
```

### Linting
```bash
flake8
```

## 🚀 Deployment

### Production Setup
1. Set `DEBUG=False` in environment
2. Configure production database URL
3. Set secure `SECRET_KEY`
4. Configure allowed hosts in `ALLOWED_HOSTS`
5. Set up SSL certificates
6. Configure background job processing with Celery/Redis

### Docker Deployment (Optional)
```dockerfile
# Dockerfile example
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 📈 Monitoring & Logging

The application uses structured logging with `structlog`. Logs include:
- Request/response tracking
- Database operations
- AI service interactions
- Error handling
- Performance metrics

## 🔒 Security

- Row Level Security (RLS) on all database tables
- JWT token authentication
- Input validation with Pydantic
- Content filtering for inappropriate input
- Rate limiting (to be implemented)
- CORS configuration
- SQL injection prevention via SQLAlchemy

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run linting and type checking
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the API documentation at `/docs`
2. Review the logs for error details
3. Ensure all required environment variables are set
4. Verify database connectivity 