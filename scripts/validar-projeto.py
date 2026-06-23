#!/usr/bin/env python3
"""Validação local do pacote Gil Personal Chef."""
from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SQL = ROOT / "supabase" / "01-estrutura-completa.sql"
ERRORS: list[str] = []


def error(message: str) -> None:
    ERRORS.append(message)


def check_javascript() -> None:
    for path in sorted((PUBLIC / "assets" / "js").glob("*.js")):
        result = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
        if result.returncode:
            error(f"JavaScript inválido: {path.relative_to(ROOT)} — {result.stderr.strip()}")

    for html in sorted(PUBLIC.rglob("*.html")):
        soup = BeautifulSoup(html.read_text(encoding="utf-8"), "html.parser")
        for index, script in enumerate(soup.find_all("script")):
            if script.get("src") or not script.string or not script.string.strip():
                continue
            with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as tmp:
                tmp.write(script.string)
                tmp_path = Path(tmp.name)
            try:
                result = subprocess.run(["node", "--check", str(tmp_path)], capture_output=True, text=True)
                if result.returncode:
                    error(f"Script interno inválido: {html.relative_to(ROOT)} #{index} — {result.stderr.strip()}")
            finally:
                tmp_path.unlink(missing_ok=True)


def check_html_resources() -> None:
    external_prefixes = ("http:", "https:", "mailto:", "tel:", "#", "data:", "javascript:", "//")
    for html in sorted(PUBLIC.rglob("*.html")):
        soup = BeautifulSoup(html.read_text(encoding="utf-8"), "html.parser")
        for tag, attribute in (("a", "href"), ("img", "src"), ("script", "src"), ("link", "href")):
            for element in soup.find_all(tag):
                value = element.get(attribute)
                if not value or value.startswith(external_prefixes):
                    continue
                if value.startswith("/"):
                    error(f"Caminho absoluto incompatível com subpasta: {html.relative_to(ROOT)} → {value}")
                    continue
                clean = value.split("?", 1)[0].split("#", 1)[0]
                if not clean:
                    continue
                target = (html.parent / clean).resolve()
                try:
                    target.relative_to(PUBLIC.resolve())
                except ValueError:
                    continue
                if not target.exists():
                    error(f"Recurso ausente: {html.relative_to(ROOT)} → {value}")


def sql_columns(sql_text: str) -> dict[str, set[str]]:
    tables: dict[str, set[str]] = {}
    pattern = re.compile(r"create table public\.(\w+)\s*\((.*?)\n\);", re.I | re.S)
    for match in pattern.finditer(sql_text):
        table, body = match.groups()
        parts: list[str] = []
        buffer = ""
        depth = 0
        quoted = False
        for char in body:
            if char == "'":
                quoted = not quoted
            if not quoted:
                if char == "(":
                    depth += 1
                elif char == ")":
                    depth -= 1
            if char == "," and depth == 0 and not quoted:
                parts.append(buffer.strip())
                buffer = ""
            else:
                buffer += char
        if buffer.strip():
            parts.append(buffer.strip())
        names: list[str] = []
        for part in parts:
            column = re.match(r"([A-Za-z_]\w*)\s+", part)
            if column and column.group(1).lower() not in {"check", "unique", "primary", "foreign", "constraint"}:
                names.append(column.group(1))
        duplicates = sorted({name for name in names if names.count(name) > 1})
        if duplicates:
            error(f"Colunas duplicadas em {table}: {', '.join(duplicates)}")
        tables[table] = set(names)
    return tables


def check_page_configs() -> None:
    sql_text = SQL.read_text(encoding="utf-8")
    tables = sql_columns(sql_text)
    pattern = re.compile(r"window\.PAGE_CONFIG=(\{.*?\});</script>", re.S)
    for html in sorted((PUBLIC / "dashboard").glob("*.html")):
        match = pattern.search(html.read_text(encoding="utf-8"))
        if not match:
            continue
        try:
            config = json.loads(match.group(1))
        except json.JSONDecodeError as exc:
            error(f"PAGE_CONFIG inválido em {html.name}: {exc}")
            continue
        table = config.get("table")
        if table not in tables:
            error(f"Tabela inexistente em {html.name}: {table}")
            continue
        expected = tables[table]
        for field in config.get("fields", []):
            if field.get("name") not in expected:
                error(f"Campo inexistente em {html.name}: {table}.{field.get('name')}")
        for column in config.get("columns", []):
            if column.get("key") not in expected:
                error(f"Coluna inexistente em {html.name}: {table}.{column.get('key')}")


def check_forbidden_refs() -> None:
    forbidden = ("/api/", "google_calendar", "GOOGLE_CLIENT_SECRET", "VERCEL_URL", "BUFFET & CONGELADOS")
    for path in sorted(PUBLIC.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in {".html", ".js", ".css", ".txt", ".xml"}:
            continue
        if path.name in {"supabase.min.js", "qrcode.min.js"}:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for token in forbidden:
            if token.lower() in text.lower():
                error(f"Referência proibida em {path.relative_to(ROOT)}: {token}")


def main() -> int:
    check_javascript()
    check_html_resources()
    check_page_configs()
    check_forbidden_refs()
    if ERRORS:
        print("VALIDAÇÃO COM FALHAS")
        for item in ERRORS:
            print(f"- {item}")
        return 1
    print("VALIDAÇÃO CONCLUÍDA SEM FALHAS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
