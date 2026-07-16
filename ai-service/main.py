import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict
import logging

from config import settings
from models import ProcessPhotoRequest, ProcessPhotoResponse, MatchFacesResponse, StatusResponse
import face_processor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service_main")

app = FastAPI(
    title="SnapEvent AI Face Recognition Service",
    description="REST API service for face detection, eye alignment, embedding generation, and vector index matching.",
    version="1.0.0",
    docs_url="/docs"
)

# Enable CORS for Next.js app requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temp storage for uploaded files
TEMP_DIR = "/tmp" if os.name != "nt" else os.path.join(os.environ.get("TEMP", "."), "snapevent_selfies")
os.makedirs(TEMP_DIR, exist_ok=True)

# In-memory status map for tracking async jobs (if any)
_photo_status_db: Dict[str, str] = {}

@app.get("/", response_model=StatusResponse)
def root():
    return {
        "status": "healthy",
        "details": f"AI Face Recognition Service active using {settings.MODEL_NAME} / {settings.DETECTOR_BACKEND}"
    }

@app.post("/detect-face")
async def detect_face(file: UploadFile = File(...)):
    """Detect faces and return bounding boxes."""
    temp_path = os.path.join(TEMP_DIR, f"upload_{file.filename}")
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        faces = face_processor.get_face_embeddings(temp_path)
        
        # Format response
        detections = []
        for f in faces:
            detections.append({
                "confidence": f["confidence"],
                "boundingBox": f["boundingBox"]
            })
            
        return {
            "faceCount": len(detections),
            "detections": detections
        }
    except Exception as e:
        logger.error(f"Error in /detect-face: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/generate-embedding")
async def generate_embedding(file: UploadFile = File(...)):
    """Extract face embedding vector (512 float floats)."""
    temp_path = os.path.join(TEMP_DIR, f"upload_{file.filename}")
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        faces = face_processor.get_face_embeddings(temp_path)
        if not faces:
            raise HTTPException(status_code=400, detail="No face detected in file.")
            
        return {
            "embedding": faces[0]["embedding"],
            "boundingBox": faces[0]["boundingBox"],
            "confidence": faces[0]["confidence"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /generate-embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/process-photo", response_model=ProcessPhotoResponse)
def process_photo(request: ProcessPhotoRequest):
    """
    Downloads photographer image, detects all faces, extracts embeddings,
    and registers them into the room's vector index.
    """
    photo_id = request.photoId
    room_id = request.roomId
    image_url = request.imageUrl
    
    logger.info(f"Processing photo {photo_id} for room {room_id}")
    _photo_status_db[photo_id] = "processing"
    
    try:
        face_count, faces_data = face_processor.register_photo_embeddings(
            photo_id=photo_id,
            room_id=room_id,
            image_url=image_url
        )
        
        _photo_status_db[photo_id] = "completed"
        
        # Map faces to serialized formats (excluding numpy arrays)
        faces_meta = []
        for idx, face in enumerate(faces_data):
            faces_meta.append({
                "faceId": f"emb_{photo_id}_{idx}",
                "confidence": face["confidence"],
                "boundingBox": face["boundingBox"]
            })
            
        return {
            "photoId": photo_id,
            "roomId": room_id,
            "faceCount": face_count,
            "status": "completed",
            "faces": faces_meta
        }
        
    except Exception as e:
        logger.error(f"Failed to process photo {photo_id}: {e}")
        _photo_status_db[photo_id] = "failed"
        return {
            "photoId": photo_id,
            "roomId": room_id,
            "faceCount": 0,
            "status": "failed",
            "faces": [],
            "error": str(e)
        }

@app.post("/match-faces", response_model=MatchFacesResponse)
async def match_faces(
    roomId: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Matches an uploaded guest selfie against the room's registered photos vector index.
    """
    temp_path = os.path.join(TEMP_DIR, f"selfie_{file.filename}")
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        matched_ids, confidences = face_processor.match_selfie_against_room(
            room_id=roomId,
            selfie_path=temp_path
        )
        
        return {
            "roomId": roomId,
            "matchedPhotoIds": matched_ids,
            "confidences": confidences,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error matching faces: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/processing-status/{photo_id}", response_model=StatusResponse)
def get_processing_status(photo_id: str):
    """Retrieve processing status of a photo."""
    status = _photo_status_db.get(photo_id, "unknown")
    return {
        "status": status,
        "details": f"Photo {photo_id} processing state: {status}"
    }

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting server on {settings.HOST}:{settings.PORT}")
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
