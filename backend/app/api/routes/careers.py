from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.schemas.assessment import AssessmentCreate, AssessmentResult
from app.services.career_service import analyze_career, CAREER_SKILLS

router = APIRouter(prefix="/api/careers", tags=["careers"])


class SkillMatchRequest(BaseModel):
    target_role: str = Field(min_length=1, max_length=120)
    skills: list[str] = Field(default_factory=list, max_length=100)


@router.post("/analyze", response_model=AssessmentResult)
def analyze(payload: AssessmentCreate):
    try:
        return analyze_career(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/skill-match")
def skill_match(payload: SkillMatchRequest):
    required = CAREER_SKILLS.get(payload.target_role)
    if required is None:
        raise HTTPException(status_code=422, detail="Choose a supported target role.")

    # Unsupervised character n-gram TF-IDF similarity surfaces related terminology.
    # It is advisory only: fuzzy matches are not automatically credited in readiness.
    provided = [skill.strip() for skill in payload.skills if skill.strip()]
    vocabulary = required + provided
    if not provided:
        return {"matches": [], "method": "TF-IDF character n-gram similarity",
                "note": "Similarity suggestions are advisory; only confirmed skills count toward readiness."}

    vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), lowercase=True)
    matrix = vectorizer.fit_transform(vocabulary)
    candidates = []
    for index, skill in enumerate(provided):
        similarities = cosine_similarity(matrix[len(required) + index], matrix[:len(required)]).ravel()
        best = int(similarities.argmax())
        score = float(similarities[best])
        if score >= 0.38 and skill.casefold() != required[best].casefold():
            candidates.append({"provided_skill": skill, "related_target_skill": required[best],
                               "similarity": round(score, 3), "requires_confirmation": True})
    return {"matches": candidates, "method": "TF-IDF character n-gram similarity",
            "note": "This unsupervised text-similarity signal is experimental, not a validated proficiency or employability model. Confirm every suggested match manually."}
