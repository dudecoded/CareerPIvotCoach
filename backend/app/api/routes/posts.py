from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy.orm import Session
from app.api.routes.auth import current_user
from app.db.database import get_db
from app.models.user import User
from app.models.post import Post, PostLike, PostBookmark, PostComment

router = APIRouter(prefix="/api/posts", tags=["community blog"])

class PostCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    body: str = Field(min_length=20, max_length=12000)
    category: str = Field(default="Career notes", max_length=60)
    source_url: HttpUrl | None = None

class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)

def serialize_post(post, db, user_id):
    author = db.query(User).filter(User.id == post.author_id).first()
    return {
        "id": post.id, "title": post.title, "body": post.body, "category": post.category,
        "source_url": post.source_url, "author_id": post.author_id,
        "author_name": author.name if author else "CareerPivot member",
        "created_at": post.created_at.isoformat(),
        "likes": db.query(PostLike).filter(PostLike.post_id == post.id).count(),
        "comments_count": db.query(PostComment).filter(PostComment.post_id == post.id).count(),
        "liked": db.query(PostLike).filter_by(post_id=post.id, user_id=user_id).first() is not None,
        "saved": db.query(PostBookmark).filter_by(post_id=post.id, user_id=user_id).first() is not None,
    }

@router.get("")
def list_posts(saved: bool = False, category: str | None = None, limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0), db: Session = Depends(get_db), user: User = Depends(current_user)):
    query = db.query(Post)
    if saved:
        query = query.join(PostBookmark, PostBookmark.post_id == Post.id).filter(PostBookmark.user_id == user.id)
    if category:
        query = query.filter(Post.category == category)
    posts = query.order_by(Post.created_at.desc()).offset(offset).limit(limit).all()
    return {"posts": [serialize_post(post, db, user.id) for post in posts]}

@router.post("", status_code=201)
def create_post(payload: PostCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    post = Post(author_id=user.id, title=payload.title.strip(), body=payload.body.strip(), category=payload.category.strip() or "Career notes", source_url=str(payload.source_url) if payload.source_url else None)
    db.add(post); db.commit(); db.refresh(post)
    return serialize_post(post, db, user.id)

@router.post("/{post_id}/like")
def toggle_like(post_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post: raise HTTPException(status_code=404, detail="Post not found.")
    existing = db.query(PostLike).filter_by(post_id=post_id, user_id=user.id).first()
    if existing: db.delete(existing); liked = False
    else: db.add(PostLike(post_id=post_id, user_id=user.id)); liked = True
    db.commit()
    return {"liked": liked, "likes": db.query(PostLike).filter_by(post_id=post_id).count()}

@router.post("/{post_id}/save")
def toggle_save(post_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post: raise HTTPException(status_code=404, detail="Post not found.")
    existing = db.query(PostBookmark).filter_by(post_id=post_id, user_id=user.id).first()
    if existing: db.delete(existing); saved = False
    else: db.add(PostBookmark(post_id=post_id, user_id=user.id)); saved = True
    db.commit()
    return {"saved": saved}

@router.get("/{post_id}/comments")
def list_comments(post_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not db.query(Post).filter(Post.id == post_id).first(): raise HTTPException(status_code=404, detail="Post not found.")
    rows = db.query(PostComment).filter_by(post_id=post_id).order_by(PostComment.created_at.asc()).all()
    return {"comments": [{"id": row.id, "author": (db.query(User).filter(User.id == row.author_id).first().name), "body": row.body, "created_at": row.created_at.isoformat()} for row in rows]}

@router.post("/{post_id}/comments", status_code=201)
def add_comment(post_id: int, payload: CommentCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not db.query(Post).filter(Post.id == post_id).first(): raise HTTPException(status_code=404, detail="Post not found.")
    row = PostComment(post_id=post_id, author_id=user.id, body=payload.body.strip())
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "author": user.name, "body": row.body, "created_at": row.created_at.isoformat()}
