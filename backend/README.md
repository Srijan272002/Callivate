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

## 🔧 Configuration

### Required Environment Variables (FREE SETUP)

```env
# Database (FREE - Supabase)
SUPABASE_URL=your-supabase-project-url
SUPABASE_KEY=your-supabase-anon-key
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/[db]

# AI Services (FREE - Google AI Studio)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL="gemini-2.0-flash-exp"

# Voice & Notifications (FREE alternatives)
USE_BROWSER_TTS=True
USE_EXPO_NOTIFICATIONS=True
EXPO_ACCESS_TOKEN=optional-expo-token

# Optional paid services (leave empty for free setup)
GOOGLE_TTS_API_KEY=""
ELEVENLABS_API_KEY=""
OPENAI_API_KEY=""
TWILIO_ACCOUNT_SID=""
```

> 💡 **See [FREE_SETUP_GUIDE.md](FREE_SETUP_GUIDE.md) for complete free setup instructions**

See `.env.example` for complete configuration options.

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