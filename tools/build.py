"""Gộp index.html + css/ + js/ thành một file duy nhất (dist/teacher-ai.html) để đăng lên Claude Artifact.

Chạy:  python tools/build.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text(encoding="utf-8")


def inline_css(m):
    css = (ROOT / m.group(1)).read_text(encoding="utf-8")
    return f"<style>\n{css}</style>"


def inline_js(m):
    js = (ROOT / m.group(1)).read_text(encoding="utf-8")
    return f"<script>\n{js}</script>"


html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, html)
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline_js, html)

# Artifact tự thêm khung <html>, <head>, <body> nên chỉ giữ phần bên trong.
head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
head = re.sub(r'<meta (charset|name="viewport")[^>]*>\n?', "", head)
body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)

out = ROOT / "dist" / "teacher-ai.html"
out.parent.mkdir(exist_ok=True)
out.write_text(head.strip() + "\n" + body.strip() + "\n", encoding="utf-8")
print("Đã tạo", out.relative_to(ROOT))
