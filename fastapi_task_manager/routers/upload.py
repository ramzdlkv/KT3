import uuid
from pathlib import Path
from io import BytesIO

from fastapi import APIRouter, HTTPException, Request, UploadFile
from PIL import Image, UnidentifiedImageError

router = APIRouter(tags=["upload"])

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
ORIGINALS_DIR = UPLOAD_DIR / "originals"
THUMBNAILS_DIR = UPLOAD_DIR / "thumbnails"
ORIGINALS_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {"image/png": "png", "image/jpeg": "jpg"}
MAX_SIZE = 5 * 1024 * 1024 
THUMBNAIL_SIZE = (200, 200)


@router.post("/upload")
async def upload_image(request: Request, file: UploadFile):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Неверный формат файла: допускаются только PNG и JPEG",
        )

    content = await file.read(MAX_SIZE + 1)
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Файл слишком большой: максимальный размер 5 МБ",
        )

    try:
        image = Image.open(BytesIO(content))
        image.load()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=400,
            detail="Файл повреждён или не является изображением",
        )

    filename = f"{uuid.uuid4().hex}.{ALLOWED_TYPES[file.content_type]}"

    (ORIGINALS_DIR / filename).write_bytes(content)

    thumbnail = image.copy()
    thumbnail.thumbnail(THUMBNAIL_SIZE)  
    thumbnail.save(THUMBNAILS_DIR / filename)

    base_url = str(request.base_url)
    return {
        "filename": filename,
        "original_url": f"{base_url}static/originals/{filename}",
        "thumbnail_url": f"{base_url}static/thumbnails/{filename}",
    }
