from fastapi import APIRouter
router = APIRouter(prefix="/api/learning", tags=["domain learning"])
DOMAIN_CONTENT = {
"Frontend Developer":{"overview":"Build accessible, responsive interfaces and interactive web applications.","topics":["HTML semantics and accessibility","CSS layout and responsive design","JavaScript fundamentals","React components, state and effects","TypeScript, testing and performance"],"projects":["Accessible portfolio","Task manager with persistence","Dashboard consuming an API"],"practice":["Explain the event loop","Build a reusable form","Debug a React rendering issue"]},
"Backend Developer":{"overview":"Design APIs, data models and reliable application services.","topics":["HTTP and REST API design","Python and FastAPI","SQL, indexes and transactions","Authentication and authorization","Testing and deployment"],"projects":["Authenticated CRUD API","URL shortener with analytics","Role-based task service"],"practice":["Explain database indexing","Design API pagination","Compare sessions and bearer tokens"]},
"ML Engineer":{"overview":"Build, evaluate and serve machine-learning systems responsibly.","topics":["Python, NumPy and Pandas","Probability and statistics","Supervised learning","Model validation and metrics","Deployment and explainability"],"projects":["Classification pipeline","Model comparison dashboard","Prediction API"],"practice":["Explain data leakage","Choose precision vs recall","Describe cross-validation"]},
"Data Analyst":{"overview":"Turn raw data into reliable insights and clear decisions.","topics":["Spreadsheet analysis","SQL joins and window functions","Python and Pandas","Descriptive statistics","Visualisation and storytelling"],"projects":["Exploratory sales analysis","SQL metrics report","Analytics dashboard"],"practice":["Explain a LEFT JOIN","Choose a KPI","Communicate a trend"]},
"Cybersecurity":{"overview":"Understand systems, identify risks and strengthen defensive controls.","topics":["Networking and TCP/IP","Linux fundamentals","Security principles and threat modelling","Web application security","Incident response"],"projects":["Home lab security baseline","Log analysis dashboard","Security test report for a demo app"],"practice":["Explain least privilege","Walk through incident triage","Differentiate authentication and authorization"]},
"Cloud/DevOps":{"overview":"Automate delivery and operate reliable cloud infrastructure.","topics":["Linux and shell scripting","Git and CI/CD","Containers and Docker","Cloud networking and IAM","Monitoring and infrastructure as code"],"projects":["Containerised API pipeline","Infrastructure deployment demo","Service health dashboard"],"practice":["Explain a CI/CD pipeline","Debug a container","Discuss availability and scaling"]}}
@router.get("/{domain}")
def learning_content(domain: str):
    key = next((k for k in DOMAIN_CONTENT if k.casefold() == domain.replace("-","/").casefold()),None)
    if key: return {"domain":key,**DOMAIN_CONTENT[key]}
    return {"domain":domain,"overview":"Start with fundamentals, build a small project, and practise explaining your decisions.","topics":["Core concepts","Tools and workflows","Applied practice","Testing and evaluation","Portfolio evidence"],"projects":["Guided beginner project","Practical portfolio project"],"practice":["Explain a core concept","Describe a project decision"]}


# Content-based recommendation catalogue. TF-IDF similarity ranks resources against
# the learner's stated domain, interests and skills; it does not predict employability.
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class RecommendationProfile(BaseModel):
    education: str = ""
    current_role: str = ""
    target_domain: str = "Frontend Developer"
    experience_level: str = "Beginner"
    interests: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    learning_style: str = "Project-based"
    hours_per_week: int = 5
    skills: list[str] = Field(default_factory=list)

RESOURCE_CATALOG = [
 {"kind":"course","title":"The Odin Project","provider":"The Odin Project · Free","url":"https://www.theodinproject.com/","tags":"frontend web development javascript html css full stack project"},
 {"kind":"course","title":"CS50's Introduction to Computer Science","provider":"Harvard / edX · Free to audit","url":"https://cs50.harvard.edu/x/","tags":"computer science programming fundamentals python algorithms"},
 {"kind":"course","title":"Machine Learning Specialization","provider":"DeepLearning.AI / Coursera","url":"https://www.coursera.org/specializations/machine-learning-introduction","tags":"machine learning python statistics model data science"},
 {"kind":"course","title":"SQL for Data Science","provider":"UC Davis / Coursera","url":"https://www.coursera.org/learn/sql-for-data-science","tags":"sql data analyst database analytics"},
 {"kind":"course","title":"Google Cybersecurity Certificate","provider":"Google / Coursera","url":"https://www.coursera.org/professional-certificates/google-cybersecurity","tags":"cybersecurity security networking linux"},
 {"kind":"course","title":"Python for Everybody","provider":"University of Michigan","url":"https://www.py4e.com/","tags":"python programming data automation beginner"},
 {"kind":"book","title":"Hands-On Machine Learning with Scikit-Learn, Keras & TensorFlow","author":"Aurélien Géron","tags":"machine learning python data science"},
 {"kind":"book","title":"Designing Data-Intensive Applications","author":"Martin Kleppmann","tags":"backend database systems distributed data"},
 {"kind":"book","title":"Eloquent JavaScript","author":"Marijn Haverbeke","tags":"javascript frontend programming web"},
 {"kind":"book","title":"The Pragmatic Programmer","author":"David Thomas and Andrew Hunt","tags":"software engineering programming career"},
 {"kind":"book","title":"Don't Make Me Think","author":"Steve Krug","tags":"ui ux design usability product"},
 {"kind":"creator","name":"Hitesh Choudhary","platform":"YouTube","focus":"Programming, web development and practical projects","url":"https://www.youtube.com/@HiteshCodeLab","tags":"programming python javascript web development"},
 {"kind":"creator","name":"freeCodeCamp","platform":"YouTube","focus":"Long-form courses and hands-on tutorials","url":"https://www.youtube.com/@freecodecamp","tags":"programming web python data machine learning"},
 {"kind":"creator","name":"StatQuest","platform":"YouTube","focus":"Statistics and machine learning explained visually","url":"https://www.youtube.com/@statquest","tags":"statistics machine learning data science"},
 {"kind":"creator","name":"Fireship","platform":"YouTube","focus":"Concise software and technology explainers","url":"https://www.youtube.com/@Fireship","tags":"web development frontend backend javascript"},
 {"kind":"creator","name":"NetworkChuck","platform":"YouTube","focus":"Networking, Linux and cybersecurity labs","url":"https://www.youtube.com/@NetworkChuck","tags":"cybersecurity networking linux cloud"}
]
DOMAIN_PROJECTS = {
 "Frontend Developer":["Accessible portfolio with responsive case-study pages","React task manager with authentication and persistent storage","API-powered analytics dashboard with loading and error states"],
 "Backend Developer":["Role-based REST API with tests and database migrations","URL shortener with analytics, caching and rate limits","Background job service with observability"],
 "ML Engineer":["End-to-end ML experiment with leakage-safe validation and model card","Recommendation engine with explainable similarity results","Model-serving API with monitoring and drift checks"],
 "Data Analyst":["Public dataset investigation with SQL and a reproducible notebook","Interactive KPI dashboard with a written insight report","Customer cohort analysis with clear business recommendations"],
 "Cybersecurity":["Defensive log anomaly triage dashboard","Threat-model and security test report for a demo application","Home lab documenting hardening and incident response"],
 "Cloud/DevOps":["Containerised app with CI/CD and health checks","Infrastructure-as-code deployment in a sandbox","Monitoring dashboard with alerts and runbook"]
}
DOMAIN_TRAJECTORY = {
 "Frontend Developer":["Master HTML, CSS, JavaScript and accessibility","Build React and TypeScript interfaces with tests","Ship 2 polished portfolio projects and practise frontend interviews"],
 "Backend Developer":["Learn HTTP, Python, SQL and API fundamentals","Build secure APIs with tests, auth and migrations","Deploy a monitored service and practise system design"],
 "ML Engineer":["Strengthen Python, maths, statistics and data handling","Train and compare models with sound validation","Deploy an explainable model and document its limitations"],
 "Data Analyst":["Build confidence in spreadsheets, SQL and descriptive statistics","Analyse real datasets and communicate insights visually","Publish a portfolio of 2–3 business-focused case studies"],
 "Cybersecurity":["Learn networking, Linux and security fundamentals","Practise defensive analysis in a legal lab environment","Document investigations, controls and incident-response exercises"],
 "Cloud/DevOps":["Learn Linux, Git, networking and scripting","Build container and CI/CD workflows","Deploy, monitor and document a reliable service"]
}
@router.post("/recommendations")
def recommendations(profile: RecommendationProfile):
    domain = profile.target_domain
    interests = " ".join(profile.interests)
    skill_text = " ".join(profile.skills)
    query = " ".join([domain, profile.current_role, profile.experience_level, interests, skill_text, profile.learning_style])
    corpus = [query] + [item["tags"] + " " + item.get("title", item.get("name", "")) for item in RESOURCE_CATALOG]
    matrix = TfidfVectorizer(ngram_range=(1,2), stop_words="english").fit_transform(corpus)
    scores = cosine_similarity(matrix[0:1], matrix[1:]).ravel()
    ranked = sorted(zip(RESOURCE_CATALOG, scores), key=lambda pair: pair[1], reverse=True)
    courses = [{"title":x["title"],"provider":x["provider"],"url":x["url"],"reason":f"Matched to your {domain} direction"} for x,s in ranked if x["kind"]=="course"][:3]
    books = [{"title":x["title"],"author":x["author"],"reason":f"Useful for your {domain} learning path"} for x,s in ranked if x["kind"]=="book"][:3]
    creators = [{"name":x["name"],"platform":x["platform"],"focus":x["focus"],"url":x["url"]} for x,s in ranked if x["kind"]=="creator"][:3]
    adjacent = {
      "Frontend Developer":["Backend Developer","UI/UX Designer","Product Manager"],
      "Backend Developer":["Frontend Developer","Cloud/DevOps","ML Engineer"],
      "ML Engineer":["Data Analyst","Backend Developer","Data Scientist"],
      "Data Analyst":["ML Engineer","Product Manager","Backend Developer"],
      "Cybersecurity":["Cloud/DevOps","Backend Developer","Network Engineer"],
      "Cloud/DevOps":["Backend Developer","Cybersecurity","Platform Engineer"]
    }.get(domain,["Frontend Developer","Data Analyst","Backend Developer"])
    return {"career_paths":[domain]+adjacent[:2],"projects":DOMAIN_PROJECTS.get(domain,DOMAIN_PROJECTS["Frontend Developer"]),"courses":courses,"books":books,"creators":creators,"trajectory":DOMAIN_TRAJECTORY.get(domain,DOMAIN_TRAJECTORY["Frontend Developer"]),"quote":{"text":"Great things are done by a series of small things brought together.","author":"Vincent van Gogh"}}
