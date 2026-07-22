import os
import shutil
import logging
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from models import (
    ProcessPhotoRequest,
    ProcessPhotoResponse,
    FindMyPhotosResponse,
    FindMyPhotosMatch,
    MatchFacesResponse,
    StatusResponse
)
import face_processor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_service_main")

app = FastAPI(
    title="SnapEvent AI Face Recognition Service",
    description="InsightFace (buffalo_l) Face Recognition API with strict quality filtering and 0.92 Cosine Similarity Thresholding.",
    version="2.0.0",
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

# Status tracker for async processing
_photo_status_db: Dict[str, str] = {}


@app.get("/", response_model=StatusResponse)
def root():
    return {
        "status": "healthy",
        "details": f"AI Face Recognition Service active using InsightFace model '{settings.INSIGHTFACE_MODEL}'"
    }


@app.post("/detect-face")
async def detect_face(file: UploadFile = File(...)):
    """Detect faces and return quality filtering details."""
    temp_path = os.path.join(TEMP_DIR, f"upload_{file.filename}")
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        faces, rejected_reasons = face_processor.get_face_embeddings(temp_path)

        detections = []
        for f in faces:
            detections.append({
                "confidence": f["confidence"],
                "boundingBox": f["bbox"],
                "blurScore": f.get("blurScore", 100.0),
                "pose": f.get("pose", {})
            })

        return {
            "faceCount": len(detections),
            "rejectedCount": sum(rejected_reasons.values()),
            "rejectedReasons": rejected_reasons,
            "detections": detections
        }
    except Exception as e:
        logger.error(f"Error in /detect-face: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/process-photo", response_model=ProcessPhotoResponse)
def process_photo(request: ProcessPhotoRequest):
    """
    Downloads photographer image, detects all faces, extracts 512-d embeddings,
    applies strict quality validation (size >= 80px, conf >= 0.90, blur >= 80.0, side pose rejected),
    and stores face embeddings in Firestore & vector cache.
    """
    photo_id = request.photoId
    room_id = request.roomId
    image_url = request.imageUrl

    logger.info(f"[API /process-photo] Processing photo {photo_id} for room {room_id}")
    _photo_status_db[photo_id] = "processing"

    try:
        face_count, faces_data, rejected_count, rejected_reasons = face_processor.register_photo_embeddings(
            photo_id=photo_id,
            room_id=room_id,
            image_url=image_url
        )

        _photo_status_db[photo_id] = "completed"

        faces_meta = []
        for idx, face in enumerate(faces_data):
            faces_meta.append({
                "faceId": f"emb_{photo_id}_{idx}",
                "confidence": face["confidence"],
                "boundingBox": face["bbox"],
                "blurScore": face.get("blurScore", 100.0),
                "embedding": face.get("embedding", [])
            })

        return {
            "photoId": photo_id,
            "roomId": room_id,
            "faceCount": face_count,
            "rejectedCount": rejected_count,
            "rejectedReasons": rejected_reasons,
            "status": "completed",
            "faces": faces_meta
        }

    except Exception as e:
        logger.error(f"[API /process-photo] Failed to process photo {photo_id}: {e}")
        _photo_status_db[photo_id] = "failed"
        return {
            "photoId": photo_id,
            "roomId": room_id,
            "faceCount": 0,
            "rejectedCount": 0,
            "rejectedReasons": {},
            "status": "failed",
            "faces": [],
            "error": str(e)
        }


@app.post("/find-my-photos", response_model=FindMyPhotosResponse)
async def find_my_photos(
    roomId: str = Form(...),
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    threshold: Optional[float] = Form(None)
):
    """
    Selfie Search API Endpoint:
    1. User uploads selfie.
    2. Detect faces. If no face found (or blank image): returns {"matches": []}.
    3. Generate selfie embedding.
    4. Compare against stored embeddings using Cosine Similarity.
    5. Filter using MATCH_THRESHOLD = 0.92 (reject everything below).
    6. Sort highest scores first.
    7. Return maximum Top 20 matches.
    """
    sim_threshold = threshold if threshold is not None else settings.DEFAULT_MATCH_THRESHOLD

    upload_file = file
    if not upload_file and files and len(files) > 0:
        upload_file = files[0]

    if not upload_file:
        logger.warning("[API /find-my-photos] No selfie file uploaded.")
        return {"matches": [], "totalEvaluated": 0, "thresholdUsed": sim_threshold}

    temp_path = os.path.join(TEMP_DIR, f"selfie_search_{upload_file.filename}")
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)

        top_matches, total_evaluated, threshold_used = face_processor.find_my_photos_in_room(
            room_id=roomId,
            selfie_path=temp_path,
            threshold=sim_threshold,
            top_k=settings.TOP_K_MATCHES
        )

        match_objects = [
            FindMyPhotosMatch(
                photoId=m["photoId"],
                score=m["score"],
                faceIndex=m["faceIndex"],
                confidencePercentage=m["confidencePercentage"]
            )
            for m in top_matches
        ]

        return {
            "matches": match_objects,
            "totalEvaluated": total_evaluated,
            "thresholdUsed": threshold_used
        }

    except Exception as e:
        logger.error(f"[API /find-my-photos] Error executing selfie search: {e}")
        return {"matches": [], "totalEvaluated": 0, "thresholdUsed": sim_threshold}
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                logger.warning(f"Could not remove temp selfie file {temp_path}: {e}")


@app.post("/match-faces", response_model=MatchFacesResponse)
async def match_faces(
    roomId: str = Form(...),
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    threshold: Optional[float] = Form(None)
):
    """
    Backward-compatible alias for /find-my-photos.
    Returns matchedPhotoIds, confidences, percentages, and matches array.
    """
    res = await find_my_photos(roomId=roomId, file=file, files=files, threshold=threshold)

    matched_ids = [m.photoId for m in res["matches"]]
    confidences = {m.photoId: m.score for m in res["matches"]}
    percentages = {m.photoId: m.confidencePercentage or f"{int(round(m.score * 100))}% MATCH" for m in res["matches"]}
    face_confidences = {m.photoId: 0.98 for m in res["matches"]}

    return {
        "roomId": roomId,
        "matchedPhotoIds": matched_ids,
        "confidences": confidences,
        "confidencePercentages": percentages,
        "faceConfidences": face_confidences,
        "thresholdUsed": res["thresholdUsed"],
        "totalCandidatesEvaluated": res["totalEvaluated"],
        "status": "success",
        "matches": [m.dict() for m in res["matches"]]
    }


@app.get("/processing-status/{photo_id}", response_model=StatusResponse)
def get_processing_status(photo_id: str):
    status = _photo_status_db.get(photo_id, "unknown")
    return {
        "status": status,
        "details": f"Photo {photo_id} processing status: {status}"
    }


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting SnapEvent AI Face Recognition Server on {settings.HOST}:{settings.PORT}")
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
