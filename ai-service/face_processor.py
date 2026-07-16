import os
import urllib.request
from PIL import Image
import numpy as np
import logging
from typing import List, Dict, Tuple, Any
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("face_processor")

# Try importing DeepFace, fallback to mock simulation if import fails or running in dev environment without ML libraries
DEEPFACE_AVAILABLE = False
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    logger.info("DeepFace library loaded successfully.")
except ImportError:
    logger.warning("DeepFace not found. Running in SIMULATED AI mode.")

# In-memory vector database mapping roomId -> List of dicts:
# {
#    "photoId": str,
#    "embeddings": List[np.ndarray], # Embeddings of all faces detected in this photo
#    "faces": List[Dict[str, Any]]   # Face bounding box and metadata
# }
_vector_db: Dict[str, List[Dict[str, Any]]] = {}

def download_image(url: str) -> str:
    """Download image to temporary local storage."""
    temp_dir = "/tmp" if os.name != "nt" else os.path.join(os.environ.get("TEMP", "."), "snapevent_temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    file_name = url.split("/")[-1].split("?")[0]
    if not file_name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        file_name = f"{file_name}.jpg"
        
    local_path = os.path.join(temp_dir, f"ai_{file_name}")
    
    logger.info(f"Downloading {url} to {local_path}")
    headers = {"User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response, open(local_path, "wb") as out_file:
        out_file.write(response.read())
        
    return local_path

def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return float(dot_product / (norm_v1 * norm_v2))

def get_face_embeddings(image_path: str) -> List[Dict[str, Any]]:
    """
    Detects all faces in an image, aligns them, and generates embedding vectors.
    Returns: List of dicts containing 'embedding' (numpy array), 'boundingBox' (x, y, w, h), and 'confidence'.
    """
    if not DEEPFACE_AVAILABLE:
        # Simulate detection: generate mock embedding based on random values
        # This allows Next.js frontend to complete queries without full Python setup
        logger.info(f"Simulating face extraction on {image_path}")
        np.random.seed(hash(image_path) % (2**32))
        mock_embedding = np.random.randn(512)
        mock_embedding /= np.linalg.norm(mock_embedding)
        return [{
            "embedding": mock_embedding.tolist(),
            "boundingBox": {"x": 50, "y": 50, "w": 100, "h": 100},
            "confidence": 0.98
        }]
        
    try:
        # Call DeepFace representation extraction
        # This automatically runs detection, alignment, and representation steps
        representations = DeepFace.represent(
            img_path=image_path,
            model_name=settings.MODEL_NAME,
            detector_backend=settings.DETECTOR_BACKEND,
            enforce_detection=False
        )
        
        results = []
        for rep in representations:
            embedding = rep.get("embedding")
            area = rep.get("facial_area") # {'x': 113, 'y': 80, 'w': 105, 'h': 105}
            confidence = rep.get("face_confidence", 1.0)
            
            # Skip noise / low confidence detections if MTCNN is too aggressive
            if confidence < 0.40:
                continue
                
            results.append({
                "embedding": embedding,
                "boundingBox": {
                    "x": area.get("x", 0),
                    "y": area.get("y", 0),
                    "w": area.get("w", 0),
                    "h": area.get("h", 0)
                },
                "confidence": float(confidence)
            })
            
        logger.info(f"Extracted {len(results)} faces using {settings.MODEL_NAME}")
        return results
        
    except Exception as e:
        logger.error(f"Error extracting embeddings from image: {e}")
        return []

def register_photo_embeddings(photo_id: str, room_id: str, image_url: str) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Downloader & Register: processes a photographer photo and stores face embeddings.
    """
    local_path = None
    try:
        local_path = download_image(image_url)
        faces = get_face_embeddings(local_path)
        
        # Initialize room index if missing
        if room_id not in _vector_db:
            _vector_db[room_id] = []
            
        # Clean old index references for this photo if any (idempotency)
        _vector_db[room_id] = [p for p in _vector_db[room_id] if p["photoId"] != photo_id]
        
        if len(faces) > 0:
            _vector_db[room_id].append({
                "photoId": photo_id,
                "embeddings": [np.array(f["embedding"]) for f in faces],
                "faces": [
                    {
                        "boundingBox": f["boundingBox"],
                        "confidence": f["confidence"]
                    }
                    for f in faces
                ]
            })
            
        logger.info(f"Registered {len(faces)} faces for photo {photo_id} in room {room_id}")
        return len(faces), faces
        
    finally:
        # Clean up temporary downloads
        if local_path and os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception as e:
                logger.error(f"Failed to delete temporary file {local_path}: {e}")

def match_selfie_against_room(room_id: str, selfie_path: str) -> Tuple[List[str], Dict[str, float]]:
    """
    Matches a guest's selfie against all indexed images inside a Virtual Room.
    Returns: List of matching photoIds, and dict of their matching confidence scores.
    """
    selfie_faces = get_face_embeddings(selfie_path)
    if not selfie_faces:
        logger.warning("No face detected in guest selfie.")
        return [], {}
        
    # Validate selfie has exactly one face (or pick the largest/most confident one)
    # Pick the first/main detected face
    guest_embedding = np.array(selfie_faces[0]["embedding"])
    
    room_photos = _vector_db.get(room_id, [])
    if not room_photos:
        logger.info(f"No registered photos in index for room: {room_id}")
        
        # Simulated fallback logic: if running simulated AI, return some matching photos so the UI demo works!
        if not DEEPFACE_AVAILABLE:
            logger.info("Simulated AI active. Returning mock matching photos for UI preview.")
            return ["mock-photo-1", "mock-photo-2"], {"mock-photo-1": 0.85, "mock-photo-2": 0.76}
        return [], {}
        
    matches = []
    confidences = {}
    
    for item in room_photos:
        photo_id = item["photoId"]
        photo_embeddings = item["embeddings"]
        
        best_similarity = 0.0
        for p_emb in photo_embeddings:
            sim = cosine_similarity(guest_embedding, p_emb)
            if sim > best_similarity:
                best_similarity = sim
                
        # Cosine distance = 1 - Cosine Similarity
        # So high similarity is good!
        # If we use deepface similarity directly, Cosine Similarity threshold is 1 - threshold_distance
        # Using settings MATCH_THRESHOLD as similarity threshold for simplicity
        # E.g. Cosine Similarity threshold >= (1 - 0.40) = 0.60
        threshold = 1.0 - settings.MATCH_THRESHOLD
        
        if best_similarity >= threshold:
            matches.append(photo_id)
            confidences[photo_id] = float(best_similarity)
            
    logger.info(f"Selfie matched against {len(matches)} photos in room {room_id} (threshold={threshold})")
    
    # Sort matches by confidence descending
    matches.sort(key=lambda pid: confidences[pid], reverse=True)
    return matches, confidences
