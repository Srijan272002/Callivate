"""
Note-related Pydantic models for Callivate API
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class NoteBase(BaseModel):
    """Base note model with common fields"""
    title: str = Field(..., min_length=1, max_length=200)
    content: Optional[str] = Field(None, max_length=50000)
    font_family: str = "system"
    font_size: int = Field(default=16, ge=10, le=72)
    text_color: str = Field(default="#000000", pattern="^#[0-9A-Fa-f]{6}$")

class NoteCreate(NoteBase):
    """Model for creating a new note"""
    pass

class NoteUpdate(BaseModel):
    """Model for updating a note"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, max_length=50000)
    font_family: Optional[str] = None
    font_size: Optional[int] = Field(None, ge=10, le=72)
    text_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")

class Note(NoteBase):
    """Complete note model with all fields"""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class NoteResponse(BaseModel):
    """API response model for note data"""
    notes: list[Note]
    total: int
    
    class Config:
        from_attributes = True

class NoteSearch(BaseModel):
    """Model for note search parameters"""
    query: Optional[str] = None
    font_family: Optional[str] = None
    font_size_min: Optional[int] = Field(None, ge=10)
    font_size_max: Optional[int] = Field(None, le=72)
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)

class NoteSummary(BaseModel):
    """Model for note summary information"""
    total_notes: int
    total_characters: int
    most_used_font: str
    most_used_size: int
    last_updated: Optional[datetime] = None
    created_this_month: int
    updated_this_month: int

class NoteStats(BaseModel):
    """Model for note statistics"""
    user_id: UUID
    summary: NoteSummary
    font_families: list[str]
    font_sizes: list[int]
    color_usage: dict[str, int] 