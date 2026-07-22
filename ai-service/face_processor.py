import os
import cv2
import numpy as np
import urllib.request
from PIL import Image
import logging
from typing import List, Dict, Tuple, Any, Optional
from config import settings

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("face_processor")

# ---------------------------------------------------------
# InsightFace Model Initialization (buffalo_l)
# ---------------------------------------------------------
INSIGHTFACE_AVAILABLE = False
app_insight = None

try:
    import insightface
    from insightface.app import FaceAnalysis

    logger.info(f"Initializing InsightFace model '{settings.INSIGHTFACE_MODEL}'...")
    app_insight = FaceAnalysis(name=settings.INSIGHTFACE_MODEL, providers=['CPUExecutionProvider'])
    app_insight.prepare(ctx_id=0, det_size=(640, 640))
    INSIGHTFACE_AVAILABLE = True
    logger.info(f"[SUCCESS] InsightFace model '{settings.INSIGHTFACE_MODEL}' loaded and ready.")
except Exception as e:
    logger.error(f"[ERROR] Failed to load InsightFace model '{settings.INSIGHTFACE_MODEL}': {e}")
    INSIGHTFACE_AVAILABLE = False

# ---------------------------------------------------------
# Firebase Admin SDK Initialization (Optional/Resilient)
# ---------------------------------------------------------
db_firestore = None
try:
    import firebase_admin
    from firebase_admin import credentials, firestore

    if not firebase_admin._apps:
        # Check for service account key file or default environment
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized with service account key.")
        else:
            try:
                firebase_admin.initialize_app()
                logger.info("Firebase Admin SDK initialized with default application credentials.")
            except Exception as init_err:
                logger.info(f"Firebase Admin default init skipped: {init_err}")
                
    if firebase_admin._apps:
        db_firestore = firestore.client()
        logger.info("Firestore client ready for direct database queries.")
except Exception as fb_err:
    logger.info(f"Firestore integration info: {fb_err}")

# In-memory vector cache fallback: roomId -> List of photo records
# {
#   "photoId": str,
#   "faces": [
#      {"faceIndex": int, "embedding": List[float], "bbox": Dict, "confidence": float}
#   ]
# }
_vector_db: Dict[str, List[Dict[str, Any]]] = {}


def download_image(url: str) -> str:
    """Downloads an image from a URL to temporary local storage."""
    temp_dir = "/tmp" if os.name != "nt" else os.path.join(os.environ.get("TEMP", "."), "snapevent_temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    file_name = url.split("/")[-1].split("?")[0]
    if not file_name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        file_name = f"{file_name}.jpg"
        
    local_path = os.path.join(temp_dir, f"ai_{file_name}")
    
    logger.info(f"Downloading image from {url} to {local_path}")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response, open(local_path, "wb") as out_file:
        out_file.write(response.read())
        
    return local_path


def is_blank_or_uniform_image(image_path: str) -> bool:
    """
    Blank Image Test:
    Detects blank, solid color, black/white, or low-variance uniform images.
    Returns True if standard deviation < 15.0 or if file cannot be read.
    """
    try:
        if not os.path.exists(image_path):
            logger.warning(f"[LOG] File does not exist: {image_path}")
            return True
            
        img = cv2.imread(image_path)
        if img is None or img.size == 0:
            logger.warning(f"[LOG] Invalid or empty image array: {image_path}")
            return True

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        std_dev = float(np.std(gray))

        if std_dev < 15.0:
            logger.info(f"[LOG] REJECTED IMAGE {image_path}: Blank or uniform image detected (std_dev={std_dev:.2f} < 15.0). 0 faces returned.")
            return True

        return False
    except Exception as e:
        logger.error(f"Error inspecting image variance: {e}")
        return True


def calculate_blur_score(image_path: str, bbox: Dict[str, int]) -> float:
    """
    Calculates facial sharpness using OpenCV Laplacian variance.
    Higher values = sharper details; score < 80.0 indicates blurriness.
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return 0.0

        h_img, w_img = img.shape[:2]
        x, y, w, h = bbox.get("x", 0), bbox.get("y", 0), bbox.get("w", 0), bbox.get("h", 0)

        if w <= 0 or h <= 0:
            return 0.0

        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(w_img, x + w)
        y2 = min(h_img, y + h)

        face_crop = img[y1:y2, x1:x2]
        if face_crop.size == 0:
            return 0.0

        gray_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray_crop, cv2.CV_64F).var()
        return float(blur_score)
    except Exception as e:
        logger.warning(f"Error calculating blur score: {e}")
        return 0.0


def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    """
    Computes exact Cosine Similarity between two 512-dimensional embedding vectors.
    score = dot(v1 / ||v1||, v2 / ||v2||)
    """
    v1_arr = np.array(v1, dtype=np.float64)
    v2_arr = np.array(v2, dtype=np.float64)

    norm1 = np.linalg.norm(v1_arr)
    norm2 = np.linalg.norm(v2_arr)

    if norm1 == 0 or norm2 == 0:
        return 0.0

    unit1 = v1_arr / norm1
    unit2 = v2_arr / norm2
    dot_prod = np.dot(unit1, unit2)
    return float(np.clip(dot_prod, -1.0, 1.0))


def get_face_embeddings(image_path: str) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """
    Detects all faces in an image using InsightFace (buffalo_l) and applies strict wedding-grade validations:
    1. Blank or uniform image test (std_dev < 15.0) -> Reject whole image (0 faces)
    2. Detection confidence < 0.90 -> Reject face
    3. Face width < 80px -> Reject face
    4. Side face / extreme pose (yaw/pitch/roll > 25° or aspect ratio outside [0.65, 1.35]) -> Reject face
    5. Blurred face (blur score < 80.0) -> Reject face
    6. Invalid / zero embedding vector -> Reject face

    Logs:
    - faces detected
    - rejected faces
    - accepted valid faces

    Returns: (list_of_valid_faces, rejected_reasons_dict)
    """
    rejected_reasons = {
        "blank_or_uniform_image": 0,
        "low_confidence": 0,
        "tiny_face": 0,
        "side_or_partial_face": 0,
        "blurred_face": 0,
        "invalid_embedding": 0
    }

    # Step 1: Blank Image Check
    if is_blank_or_uniform_image(image_path):
        rejected_reasons["blank_or_uniform_image"] += 1
        logger.info(f"[LOG] Image processing finished for {image_path}: 0 faces detected (blank/uniform image).")
        return [], rejected_reasons

    if not INSIGHTFACE_AVAILABLE or app_insight is None:
        logger.error("[ERROR] InsightFace model is not loaded. Cannot process face detection.")
        return [], rejected_reasons

    try:
        img = cv2.imread(image_path)
        if img is None:
            logger.error(f"OpenCV failed to read image file: {image_path}")
            return [], rejected_reasons

        # InsightFace detection & embedding extraction
        faces = app_insight.get(img)
        faces_detected = len(faces)
        logger.info(f"[LOG] InsightFace (buffalo_l) detected {faces_detected} face candidate(s) in {image_path}")

        valid_faces = []

        for idx, face in enumerate(faces):
            # 1. Confidence validation (det_score < 0.90)
            confidence = float(getattr(face, 'det_score', 0.0))
            if confidence < settings.MIN_CONFIDENCE:
                logger.info(f"[LOG] Rejected face #{idx}: Low confidence ({confidence:.4f} < {settings.MIN_CONFIDENCE})")
                rejected_reasons["low_confidence"] += 1
                continue

            # 2. Dimensions validation (width < 80px)
            bbox_raw = getattr(face, 'bbox', [0, 0, 0, 0])
            x1, y1, x2, y2 = int(bbox_raw[0]), int(bbox_raw[1]), int(bbox_raw[2]), int(bbox_raw[3])
            w, h = max(0, x2 - x1), max(0, y2 - y1)

            if w < settings.MIN_FACE_SIZE or h < settings.MIN_FACE_SIZE:
                logger.info(f"[LOG] Rejected face #{idx}: Face width/height < {settings.MIN_FACE_SIZE}px (Dimensions: {w}x{h}px)")
                rejected_reasons["tiny_face"] += 1
                continue

            # 3. Pose / Side Face validation (yaw/pitch/roll > 25° or aspect ratio outside [0.65, 1.35])
            pose = getattr(face, 'pose', None)
            pitch, yaw, roll = 0.0, 0.0, 0.0
            if pose is not None and len(pose) >= 3:
                pitch, yaw, roll = float(pose[0]), float(pose[1]), float(pose[2])
                if abs(yaw) > settings.MAX_POSE_ANGLE or abs(pitch) > settings.MAX_POSE_ANGLE or abs(roll) > settings.MAX_POSE_ANGLE:
                    logger.info(f"[LOG] Rejected face #{idx}: Side face pose angle exceeded (yaw={yaw:.1f}°, pitch={pitch:.1f}°, roll={roll:.1f}° > {settings.MAX_POSE_ANGLE}°)")
                    rejected_reasons["side_or_partial_face"] += 1
                    continue

            aspect_ratio = w / float(h) if h > 0 else 0.0
            if aspect_ratio < 0.65 or aspect_ratio > 1.35:
                logger.info(f"[LOG] Rejected face #{idx}: Side/partial face aspect ratio ({aspect_ratio:.2f} outside [0.65, 1.35])")
                rejected_reasons["side_or_partial_face"] += 1
                continue

            # 4. Blur score validation (Laplacian variance < 80.0)
            blur_score = calculate_blur_score(image_path, {"x": x1, "y": y1, "w": w, "h": h})
            if blur_score < settings.BLUR_THRESHOLD:
                logger.info(f"[LOG] Rejected face #{idx}: Blurry face (blurScore={blur_score:.2f} < {settings.BLUR_THRESHOLD})")
                rejected_reasons["blurred_face"] += 1
                continue

            # 5. Embedding vector validation (512-dim normalized vector)
            raw_emb = getattr(face, 'normed_embedding', None)
            if raw_emb is None or len(raw_emb) == 0:
                raw_emb = getattr(face, 'embedding', None)

            if raw_emb is None or len(raw_emb) == 0:
                logger.info(f"[LOG] Rejected face #{idx}: Null or empty embedding vector.")
                rejected_reasons["invalid_embedding"] += 1
                continue

            emb_arr = np.array(raw_emb, dtype=np.float64)
            emb_norm = np.linalg.norm(emb_arr)
            if emb_norm == 0 or len(emb_arr) != 512:
                logger.info(f"[LOG] Rejected face #{idx}: Invalid embedding vector norm or dimension ({len(emb_arr)}d).")
                rejected_reasons["invalid_embedding"] += 1
                continue

            # Ensure unit normalization (||v|| = 1.0)
            normalized_embedding = (emb_arr / emb_norm).tolist()

            valid_faces.append({
                "faceIndex": len(valid_faces),
                "embedding": normalized_embedding,
                "bbox": {"x": x1, "y": y1, "w": w, "h": h},
                "confidence": round(confidence, 4),
                "blurScore": round(blur_score, 2),
                "pose": {"pitch": round(pitch, 1), "yaw": round(yaw, 1), "roll": round(roll, 1)},
                "aspectRatio": round(aspect_ratio, 2)
            })

        rejected_total = sum(rejected_reasons.values())
        logger.info(f"[LOG] Detection Summary: {faces_detected} face candidate(s) detected | {len(valid_faces)} accepted face(s) | {rejected_total} rejected face(s) ({rejected_reasons})")
        return valid_faces, rejected_reasons

    except Exception as e:
        logger.error(f"Error during InsightFace detection on {image_path}: {e}")
        return [], rejected_reasons


def register_photo_embeddings(photo_id: str, room_id: str, image_url: str) -> Tuple[int, List[Dict[str, Any]], int, Dict[str, int]]:
    """
    Downloads photographer upload, detects all faces, extracts 512-d embeddings,
    applies strict validations, stores embeddings in memory cache and Firestore.
    """
    local_path = None
    try:
        local_path = download_image(image_url)
        faces, rejected_reasons = get_face_embeddings(local_path)
        rejected_count = sum(rejected_reasons.values())

        # Update in-memory vector cache
        if room_id not in _vector_db:
            _vector_db[room_id] = []

        # Idempotent cleanup for existing photoId
        _vector_db[room_id] = [p for p in _vector_db[room_id] if p.get("photoId") != photo_id]

        if len(faces) > 0:
            _vector_db[room_id].append({
                "photoId": photo_id,
                "faces": faces
            })

        # Sync to Firestore if available
        if db_firestore:
            try:
                doc_ref = db_firestore.collection("photos").document(photo_id)
                firestore_faces = [
                    {
                        "faceId": f"emb_{photo_id}_{f['faceIndex']}",
                        "faceIndex": f["faceIndex"],
                        "embedding": f["embedding"],
                        "confidence": f["confidence"],
                        "blurScore": f["blurScore"],
                        "boundingBox": {
                            "left": f["bbox"]["x"],
                            "top": f["bbox"]["y"],
                            "width": f["bbox"]["w"],
                            "height": f["bbox"]["h"]
                        }
                    }
                    for f in faces
                ]
                doc_ref.set({
                    "roomId": room_id,
                    "faceCount": len(faces),
                    "faces": firestore_faces,
                    "faceProcessingStatus": "completed",
                    "isProcessed": True
                }, merge=True)
                logger.info(f"[LOG] Synced {len(faces)} face embeddings to Firestore for photo {photo_id}")
            except Exception as fs_err:
                logger.error(f"Failed to write face embeddings to Firestore for photo {photo_id}: {fs_err}")

        logger.info(f"[LOG] Processed Photo {photo_id} in Room {room_id}: {len(faces)} valid faces stored, {rejected_count} bad faces rejected.")
        return len(faces), faces, rejected_count, rejected_reasons

    finally:
        if local_path and os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception as e:
                logger.warning(f"Could not remove temp photo {local_path}: {e}")


def load_room_photos_from_firestore(room_id: str) -> List[Dict[str, Any]]:
    """Fetches photo embedding documents for a room from Firestore."""
    if not db_firestore:
        return _vector_db.get(room_id, [])

    try:
        logger.info(f"Querying Firestore for photos in room: {room_id}")
        photos_ref = db_firestore.collection("photos").where("roomId", "==", room_id).where("isProcessed", "==", True)
        docs = photos_ref.stream()

        room_photos = []
        for doc in docs:
            pdata = doc.to_dict()
            pid = doc.id
            faces_raw = pdata.get("faces", [])

            valid_faces = []
            for idx, f in enumerate(faces_raw):
                emb = f.get("embedding")
                if emb and len(emb) == 512:
                    bbox_raw = f.get("boundingBox", {})
                    valid_faces.append({
                        "faceIndex": f.get("faceIndex", idx),
                        "embedding": emb,
                        "confidence": f.get("confidence", 1.0),
                        "bbox": {
                            "x": bbox_raw.get("left", 0),
                            "y": bbox_raw.get("top", 0),
                            "w": bbox_raw.get("width", 0),
                            "h": bbox_raw.get("height", 0)
                        }
                    })

            if valid_faces:
                room_photos.append({
                    "photoId": pid,
                    "faces": valid_faces
                })

        logger.info(f"[LOG] Loaded {len(room_photos)} photo(s) with face embeddings from Firestore for room {room_id}")
        return room_photos
    except Exception as e:
        logger.error(f"Error querying Firestore for room {room_id}: {e}")
        return _vector_db.get(room_id, [])


def find_my_photos_in_room(
    room_id: str,
    selfie_path: str,
    threshold: float = 0.92,
    top_k: int = 20
) -> Tuple[List[Dict[str, Any]], int, float]:
    """
    Selfie Search Pipeline:
    1. User uploads selfie.
    2. Detect face in selfie.
       If no face found (or blank image): return {"matches": []} immediately!
    3. Generate 512-d normalized selfie embedding.
    4. Retrieve stored face embeddings for room.
    5. Compare using exact cosine similarity:
       score = cosine_similarity(selfie_embedding, stored_embedding)
    6. Filter using MATCH_THRESHOLD = 0.92. Reject everything below 0.92!
    7. Sort matches by score descending (highest score first).
    8. Return maximum Top 20 matches.
    """
    logger.info(f"[LOG] Starting Selfie Search for Room: {room_id} | Configured MATCH_THRESHOLD: {threshold}")

    # Step 1 & 2: Selfie Detection & Validation
    selfie_faces, rejected_selfie_reasons = get_face_embeddings(selfie_path)

    # BLANK IMAGE / NO FACE TEST
    if not selfie_faces or len(selfie_faces) == 0:
        logger.info(f"[LOG] Selfie Search Result for Room {room_id}: 0 face detected in selfie (Blank or invalid selfie). Returning 0 matches.")
        return [], 0, threshold

    # Primary selfie embedding (512-dim unit vector)
    selfie_emb = np.array(selfie_faces[0]["embedding"], dtype=np.float64)

    # Step 4: Retrieve stored photo embeddings for the room
    room_photos = _vector_db.get(room_id, [])
    if not room_photos:
        room_photos = load_room_photos_from_firestore(room_id)

    if not room_photos:
        logger.info(f"[LOG] No stored photo face embeddings found for room: {room_id}. Returning 0 matches.")
        return [], 0, threshold

    matches = []
    total_evaluated = 0

    # Step 5 & 6: Compare using Cosine Similarity and filter < 0.92
    for photo_item in room_photos:
        photo_id = photo_item["photoId"]
        photo_faces = photo_item.get("faces", [])

        best_score = -1.0
        best_face_idx = 0

        for f_info in photo_faces:
            stored_emb = np.array(f_info["embedding"], dtype=np.float64)
            sim_score = cosine_similarity(selfie_emb, stored_emb)
            total_evaluated += 1

            logger.info(f"[LOG] Evaluating Photo {photo_id} Face #{f_info.get('faceIndex', 0)} | Similarity Value: {sim_score:.4f}")

            if sim_score > best_score:
                best_score = sim_score
                best_face_idx = f_info.get("faceIndex", 0)

        # Enforce threshold = 0.92
        if best_score >= threshold:
            percentage_str = f"{int(round(best_score * 100))}% MATCH"
            matches.append({
                "photoId": photo_id,
                "score": round(float(best_score), 4),
                "faceIndex": best_face_idx,
                "confidencePercentage": percentage_str
            })
            logger.info(f"[LOG] ACCEPTED MATCH: Photo {photo_id} | Similarity: {best_score:.4f} ({percentage_str}) >= MATCH_THRESHOLD {threshold}")
        else:
            logger.info(f"[LOG] REJECTED MATCH: Photo {photo_id} | Best Similarity: {best_score:.4f} < MATCH_THRESHOLD {threshold}")

    # Step 7: Sort matches by score descending (highest score first)
    matches.sort(key=lambda m: m["score"], reverse=True)

    # Step 8: Return maximum Top 20 matches
    top_matches = matches[:top_k]

    logger.info(f"[LOG] Selfie Search Summary for Room {room_id}: Evaluated {total_evaluated} candidate faces across {len(room_photos)} photos | Accepted matches (>= {threshold}): {len(matches)} | Returning top {len(top_matches)} matches")

    return top_matches, total_evaluated, threshold
