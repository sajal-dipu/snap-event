import os

class Settings:
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8080"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # InsightFace model configuration
    INSIGHTFACE_MODEL: str = os.getenv("INSIGHTFACE_MODEL", "buffalo_l")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "ArcFace")
    DETECTOR_BACKEND: str = os.getenv("DETECTOR_BACKEND", "retinaface")
    DISTANCE_METRIC: str = os.getenv("DISTANCE_METRIC", "cosine")
    
    # Strict wedding-grade matching threshold (0.92 cosine similarity)
    DEFAULT_MATCH_THRESHOLD: float = float(os.getenv("MATCH_THRESHOLD", "0.92"))

    # Quality filtering rules for wedding-grade precision
    MIN_FACE_SIZE: int = int(os.getenv("MIN_FACE_SIZE", "80"))         # Minimum 80px face width
    MIN_CONFIDENCE: float = float(os.getenv("MIN_CONFIDENCE", "0.90")) # Minimum 0.90 face confidence score
    MAX_POSE_ANGLE: float = float(os.getenv("MAX_POSE_ANGLE", "25.0")) # Maximum pose angle (yaw/pitch/roll)
    BLUR_THRESHOLD: float = float(os.getenv("BLUR_THRESHOLD", "80.0")) # Minimum Laplacian variance blur score
    TOP_K_MATCHES: int = int(os.getenv("TOP_K_MATCHES", "20"))         # Maximum top exact matches returned (Top 20)

settings = Settings()


