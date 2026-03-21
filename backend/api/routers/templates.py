from fastapi import APIRouter

router = APIRouter()


# TODO: Port template operations
@router.get("/")
async def list_templates():
    return {"templates": []}
