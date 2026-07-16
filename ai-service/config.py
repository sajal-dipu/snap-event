import os

class Settings:
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8080"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # AI Models configuration (DeepFace defaults)
    # Available models: "VGG-Face", "Facenet", "Facenet512", "OpenFace", "DeepFace", "DeepID", "ArcFace", "Dlib", "SFace"
    MODEL_NAME: str = os.getenv("MODEL_NAME", "Facenet512")
    
    # Detector backends: "opencv", "ssd", "dlib", "mtcnn", "retinaface", "mediapipe", "yolov8", "yunet"
    DETECTOR_BACKEND: str = os.getenv("DETECTOR_BACKEND", "mtcnn")
    
    # Distance metric: "cosine", "euclidean", "euclidean_l2"
    DISTANCE_METRIC: str = os.getenv("DISTANCE_METRIC", "cosine")
    
    # Threshold for a positive match (Cosine threshold for Facenet512 is generally around 0.35 - 0.40)
    MATCH_THRESHOLD: float = float(os.getenv("MATCH_THRESHOLD", "0.40"))

settings = Settings()
