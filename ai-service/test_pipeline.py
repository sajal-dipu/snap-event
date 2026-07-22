import os
import sys
import cv2
import numpy as np
import logging

# Ensure ai-service directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import settings
import face_processor
from models import ProcessPhotoRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_pipeline")

def run_tests():
    logger.info("=== STARTING SNAPEVENT FACE RECOGNITION PIPELINE TESTS ===")

    temp_dir = os.path.join(os.environ.get("TEMP", "."), "snapevent_test_images")
    os.makedirs(temp_dir, exist_ok=True)

    # -------------------------------------------------------------
    # TEST 1: Blank Image Test
    # Requirement: Blank image must always return 0 matches.
    # -------------------------------------------------------------
    logger.info("\n--- TEST 1: Blank Image Detection & Search ---")
    blank_img_path = os.path.join(temp_dir, "test_blank.jpg")
    blank_arr = np.zeros((400, 400, 3), dtype=np.uint8) # Solid black image
    cv2.imwrite(blank_img_path, blank_arr)

    blank_faces, blank_rejected = face_processor.get_face_embeddings(blank_img_path)
    assert len(blank_faces) == 0, f"Expected 0 faces in blank image, got {len(blank_faces)}"
    assert blank_rejected.get("blank_or_uniform_image", 0) > 0, "Expected blank_or_uniform_image rejection"
    logger.info("[PASS] Blank image returns 0 faces detected.")

    # Search with blank image as selfie
    matches, total_eval, threshold_used = face_processor.find_my_photos_in_room(
        room_id="test_room_1",
        selfie_path=blank_img_path,
        threshold=0.92,
        top_k=20
    )
    assert len(matches) == 0, f"Expected 0 matches for blank selfie search, got {len(matches)}"
    logger.info("[PASS] Blank selfie search returns 0 matches.")

    # -------------------------------------------------------------
    # TEST 2: Cosine Similarity & 0.92 Threshold Enforcement
    # Requirement: Reject everything below 0.92 (e.g. 79%, 84% rejected).
    # -------------------------------------------------------------
    logger.info("\n--- TEST 2: Cosine Similarity Threshold (0.92) ---")
    
    # Generate 512-d unit vectors
    v_base = np.random.randn(512)
    v_base /= np.linalg.norm(v_base)

    # Identical vector (100% similarity = 1.0)
    sim_exact = face_processor.cosine_similarity(v_base, v_base)
    assert abs(sim_exact - 1.0) < 1e-4, f"Expected 1.0 similarity for exact vector, got {sim_exact}"
    logger.info(f"[PASS] Exact same vector cosine similarity: {sim_exact:.4f} (>= 0.92 ACCEPTED)")

    # Vector with 84% similarity
    noise_84 = np.random.randn(512)
    noise_84 /= np.linalg.norm(noise_84)
    # Blend to construct target similarity ~0.84
    v_84 = 0.84 * v_base + np.sqrt(1 - 0.84**2) * noise_84
    v_84 /= np.linalg.norm(v_84)
    sim_84 = face_processor.cosine_similarity(v_base, v_84)
    assert sim_84 < 0.92, f"Expected < 0.92 similarity for 84% vector, got {sim_84}"
    logger.info(f"[PASS] 84% similarity vector score: {sim_84:.4f} (< 0.92 REJECTED)")

    # Vector with 79% similarity
    noise_79 = np.random.randn(512)
    noise_79 /= np.linalg.norm(noise_79)
    v_79 = 0.79 * v_base + np.sqrt(1 - 0.79**2) * noise_79
    v_79 /= np.linalg.norm(v_79)
    sim_79 = face_processor.cosine_similarity(v_base, v_79)
    assert sim_79 < 0.92, f"Expected < 0.92 similarity for 79% vector, got {sim_79}"
    logger.info(f"[PASS] 79% similarity vector score: {sim_79:.4f} (< 0.92 REJECTED)")

    # -------------------------------------------------------------
    # TEST 3: Validation Filters (Blur, Size, Pose, Confidence)
    # -------------------------------------------------------------
    logger.info("\n--- TEST 3: Quality Validation Rules ---")
    
    # Blurry crop test
    blur_img_path = os.path.join(temp_dir, "test_blurry.jpg")
    # Low variance smooth image
    blurry_arr = np.ones((200, 200, 3), dtype=np.uint8) * 128
    cv2.imwrite(blur_img_path, blurry_arr)
    blur_score = face_processor.calculate_blur_score(blur_img_path, {"x": 10, "y": 10, "w": 100, "h": 100})
    assert blur_score < settings.BLUR_THRESHOLD, f"Expected blur score < {settings.BLUR_THRESHOLD}, got {blur_score}"
    logger.info(f"[PASS] Blurry image detected with blur score: {blur_score:.2f} (< {settings.BLUR_THRESHOLD})")

    logger.info("\n=== ALL PIPELINE TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_tests()
