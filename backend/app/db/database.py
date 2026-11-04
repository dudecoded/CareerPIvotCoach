from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Store the SQLite database inside the backend directory, independent of cwd.
BACKEND_DIR = Path(__file__).resolve().parents[2]
DATABASE_URL = f"sqlite:///{(BACKEND_DIR / 'career_pivot_coach.db').as_posix()}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
