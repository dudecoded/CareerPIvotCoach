from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from app.db.database import Base

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(180), nullable=False)
    body = Column(Text, nullable=False)
    category = Column(String(60), nullable=False, default="Career notes")
    source_url = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)

class PostLike(Base):
    __tablename__ = "post_likes"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_post_like_user"),)

class PostBookmark(Base):
    __tablename__ = "post_bookmarks"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_post_bookmark_user"),)

class PostComment(Base):
    __tablename__ = "post_comments"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    body = Column(String(2000), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
