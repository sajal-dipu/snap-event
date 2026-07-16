from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any

class ProcessPhotoRequest(BaseModel):
    photoId: str
    roomId: str
    imageUrl: str

class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int

class FaceDetectionInfo(BaseModel):
    confidence: float
    boundingBox: BoundingBox

class ProcessPhotoResponse(BaseModel):
    photoId: str
    roomId: str
    faceCount: int
    status: str
    faces: List[Dict[str, Any]]
    error: Optional[str] = None

class MatchFacesResponse(BaseModel):
    roomId: str
    matchedPhotoIds: List[str]
    confidences: Dict[str, float]
    status: str

class StatusResponse(BaseModel):
    status: str
    details: Optional[str] = None
