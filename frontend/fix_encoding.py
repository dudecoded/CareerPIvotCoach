from pathlib import Path

p = Path("src/App.tsx")
text = p.read_text(encoding="utf-8-sig")

fixes = {
"âœ¦": "✦",
"âœ³": "✳",
"âœ“": "✓",
"â†’": "→",
"â€”": "—",
"â€“": "–",
"â€œ": "“",
"â€™": "’",
"Â·": "·",
"â—‡": "◇",
"â—ˆ": "◈",
"â–¥": "▥",
}

for broken, correct in fixes.items():
text = text.replace(broken, correct)

p.write_text(text, encoding="utf-8")
print("App.tsx encoding cleanup finished.")
