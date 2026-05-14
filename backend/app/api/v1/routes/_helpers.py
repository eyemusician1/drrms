from beanie import Document
from bson.errors import InvalidId
from fastapi import HTTPException, status


async def get_document_or_404(model: type[Document], document_id: str, detail: str):
    try:
        document = await model.get(document_id)
    except (InvalidId, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document id",
        )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    return document


def apply_update(document: Document, update_data: dict):
    for field, value in update_data.items():
        setattr(document, field, value)
    return document