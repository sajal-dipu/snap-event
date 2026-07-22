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
    rejectedCount: int = 0
    rejectedReasons: Dict[str, int] = {}
    status: str
    faces: List[Dict[str, Any]]
    error: Optional[str] = None

class FindMyPhotosMatch(BaseModel):
    photoId: str
    score: float
    faceIndex: int = 0
    confidencePercentage: Optional[str] = None

class FindMyPhotosResponse(BaseModel):
    matches: List[FindMyPhotosMatch] = []
    totalEvaluated: int = 0
    thresholdUsed: float = 0.92

class MatchFacesResponse(BaseModel):
    roomId: str
    matchedPhotoIds: List[str]
    confidences: Dict[str, float]
    confidencePercentages: Dict[str, str] = {}
    faceConfidences: Dict[str, float] = {}
    thresholdUsed: float = 0.92
    totalCandidatesEvaluated: int = 0
    status: str
    matches: List[Dict[str, Any]] = []

class StatusResponse(BaseModel):
    status: str
    details: Optional[str] = None
