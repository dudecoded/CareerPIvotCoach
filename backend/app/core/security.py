import base64, hashlib, hmac, json, os, secrets, time
_SECRET = os.getenv("CPC_SECRET_KEY", "development-only-change-this-secret-before-deploying").encode()
_ITERATIONS = 310_000
def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode().rstrip("=")
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return "pbkdf2_sha256$" + str(_ITERATIONS) + "$" + base64.urlsafe_b64encode(salt).decode() + "$" + base64.urlsafe_b64encode(digest).decode()
def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, iterations, salt, expected = encoded.split("$", 3)
        if scheme != "pbkdf2_sha256": return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.urlsafe_b64decode(salt), int(iterations))
        return hmac.compare_digest(base64.urlsafe_b64encode(actual).decode(), expected)
    except (ValueError, TypeError): return False
def create_access_token(user_id: int) -> str:
    header = _b64(json.dumps({"alg":"HS256","typ":"JWT"}, separators=(",",":")).encode())
    payload = _b64(json.dumps({"sub":str(user_id),"exp":int(time.time())+604800}, separators=(",",":")).encode())
    signing = header + "." + payload
    return signing + "." + _b64(hmac.new(_SECRET, signing.encode(), hashlib.sha256).digest())
def decode_access_token(token: str) -> int:
    try:
        header, payload, signature = token.split(".")
        expected = _b64(hmac.new(_SECRET, (header+"."+payload).encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected): raise ValueError("Invalid token")
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if int(data["exp"]) < int(time.time()): raise ValueError("Expired token")
        return int(data["sub"])
    except Exception as exc: raise ValueError("Invalid or expired access token") from exc
