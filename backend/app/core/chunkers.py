"""
app/core/chunkers.py
Language-aware code chunkers: Python AST, JS/TS brace-matching, and generic
sliding-window line chunker (delegated to app.utils.text).
"""

import ast
import re
from pathlib import Path
from typing import Any, Dict, List

from app.config.settings import SUPPORTED_EXTENSIONS
from app.utils.text import chunk_text_lines, count_tokens


# ── Python AST Chunker ─────────────────────────────────────────────────────

def chunk_python_file(path: Path, repo_root: Path) -> List[Dict[str, Any]]:
    """Parse Python via AST; fall back to line chunking on syntax error."""
    try:
        source = path.read_text(encoding="utf-8")
    except Exception:
        return []

    rel = str(path.relative_to(repo_root)).replace("\\", "/")

    try:
        tree = ast.parse(source)
    except SyntaxError:
        return chunk_text_lines(source.splitlines(), 1, rel)

    lines = source.splitlines()
    chunks: List[Dict[str, Any]] = []

    def _node_text(node: ast.AST):
        start = node.lineno - 1  # type: ignore[attr-defined]
        end = getattr(node, "end_lineno", start + 1)
        return "\n".join(lines[start:end]), start + 1, end

    def _parent_class(func_node: ast.AST) -> str:
        for cls in ast.walk(tree):
            if not isinstance(cls, ast.ClassDef):
                continue
            c_start, c_end = cls.lineno, getattr(cls, "end_lineno", cls.lineno)
            if c_start <= func_node.lineno <= c_end and cls is not func_node:  # type: ignore[attr-defined]
                return cls.name
        return ""

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            text, start, end = _node_text(node)
            docstring = ast.get_docstring(node) or ""
            if count_tokens(text) <= 800:
                chunks.append({"chunk": text, "metadata": {
                    "file": rel, "type": "class", "name": node.name,
                    "start_line": start, "end_line": end, "docstring": docstring,
                }})
            else:
                first_func = end
                for sub in node.body:
                    if isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        first_func = sub.lineno - 1
                        break
                header = "\n".join(lines[start - 1 : first_func])
                chunks.append({"chunk": header, "metadata": {
                    "file": rel, "type": "class_header", "name": node.name,
                    "start_line": start, "end_line": first_func, "docstring": docstring,
                }})

        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            text, start, end = _node_text(node)
            docstring = ast.get_docstring(node) or ""
            parent = _parent_class(node)
            name = f"{parent}.{node.name}" if parent else node.name
            chunk_type = "method" if parent else "function"
            if count_tokens(text) <= 800:
                chunks.append({"chunk": text, "metadata": {
                    "file": rel, "type": chunk_type, "name": name,
                    "start_line": start, "end_line": end, "docstring": docstring,
                }})
            else:
                for sc in chunk_text_lines(text.splitlines(), start, rel):
                    sc["metadata"].update({"type": f"{chunk_type}_chunk", "name": name, "docstring": docstring})
                    chunks.append(sc)

    return chunks or chunk_text_lines(lines, 1, rel)


# ── JS/TS Brace-Matching Chunker ───────────────────────────────────────────

_JSTS_PATTERN = re.compile(
    r"(?:export\s+(?:default\s+)?)?(?:"
    r"class\s+(?P<class_name>\w+)|"
    r"function\s+(?P<func_name>\w+)|"
    r"const\s+(?P<comp_name>\w+)\s*=\s*(?:\([^)]*\)|[^=]+)?\s*=>|"
    r"const\s+(?P<func_expr_name>\w+)\s*=\s*function"
    r")",
    re.MULTILINE,
)


def chunk_jsts_file(path: Path, repo_root: Path) -> List[Dict[str, Any]]:
    """Chunk JS/TS via regex + brace matching; fall back to line chunks."""
    try:
        source = path.read_text(encoding="utf-8")
    except Exception:
        return []

    import bisect
    rel = str(path.relative_to(repo_root)).replace("\\", "/")
    lines_list = source.splitlines()
    line_starts = []
    pos = 0
    for ln in lines_list:
        line_starts.append(pos)
        pos += len(ln) + 1

    def _line_of(char_idx: int) -> int:
        return bisect.bisect_right(line_starts, char_idx)

    chunks: List[Dict[str, Any]] = []
    covered: set[int] = set()

    for m in _JSTS_PATTERN.finditer(source):
        name = (m.group("class_name") or m.group("func_name")
                or m.group("comp_name") or m.group("func_expr_name"))
        if not name:
            continue
        brace = source.find("{", m.end())
        if brace == -1:
            continue
        depth, idx = 1, brace + 1
        while idx < len(source) and depth:
            if source[idx] == "{":
                depth += 1
            elif source[idx] == "}":
                depth -= 1
            idx += 1
        if depth:
            continue
        sl, el = _line_of(m.start()), _line_of(idx)
        line_range = set(range(sl, el + 1))
        if line_range & covered:
            continue
        covered |= line_range
        text = source[m.start():idx]
        ctype = "class" if m.group("class_name") else "function"
        if count_tokens(text) <= 800:
            chunks.append({"chunk": text, "metadata": {
                "file": rel, "type": ctype, "name": name,
                "start_line": sl, "end_line": el,
            }})
        else:
            for sc in chunk_text_lines(text.splitlines(), sl, rel):
                sc["metadata"].update({"type": f"{ctype}_chunk", "name": name})
                chunks.append(sc)

    # Fill gaps
    prev = 1
    for ln in sorted(covered):
        if ln > prev:
            gap = lines_list[prev - 1 : ln - 1]
            chunks.extend(chunk_text_lines(gap, prev, rel))
        prev = ln + 1
    if prev <= len(lines_list):
        chunks.extend(chunk_text_lines(lines_list[prev - 1 :], prev, rel))

    return chunks


# ── Router ─────────────────────────────────────────────────────────────────

def chunk_file(path: Path, repo_root: Path) -> List[Dict[str, Any]]:
    """Dispatch file to the appropriate chunker."""
    suffix = path.suffix.lower()
    if suffix == ".py":
        return chunk_python_file(path, repo_root)
    if suffix in {".js", ".ts", ".jsx", ".tsx"}:
        return chunk_jsts_file(path, repo_root)
    if suffix in SUPPORTED_EXTENSIONS:
        try:
            source = path.read_text(encoding="utf-8")
            rel = str(path.relative_to(repo_root)).replace("\\", "/")
            return chunk_text_lines(source.splitlines(), 1, rel)
        except Exception:
            return []
    return []
