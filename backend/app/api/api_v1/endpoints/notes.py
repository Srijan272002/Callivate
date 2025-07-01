"""
Note management endpoints for Callivate API
"""

from fastapi import APIRouter, HTTPException, status
from typing import List
from app.models.note import Note, NoteCreate, NoteUpdate

router = APIRouter()

@router.get("/", response_model=List[Note])
async def get_notes():
    """Get user's notes"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Note endpoints to be implemented"
    )

@router.post("/", response_model=Note)
async def create_note(note: NoteCreate):
    """Create a new note"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Note endpoints to be implemented"
    )

@router.get("/{note_id}", response_model=Note)
async def get_note(note_id: str):
    """Get specific note"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Note endpoints to be implemented"
    )

@router.put("/{note_id}", response_model=Note)
async def update_note(note_id: str, note_update: NoteUpdate):
    """Update a note"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Note endpoints to be implemented"
    )

@router.delete("/{note_id}")
async def delete_note(note_id: str):
    """Delete a note"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Note endpoints to be implemented"
    ) 