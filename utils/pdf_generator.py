import re
from fpdf import FPDF


def _sanitize(text) -> str:
    """fpdf2's core fonts (Helvetica/Times/Courier) only support latin-1, and
    LLM output regularly contains smart quotes/dashes that aren't in it."""
    if not isinstance(text, str):
        text = str(text)
    replacements = {
        "‘": "'", "’": "'", "“": '"', "”": '"',
        "–": "-", "—": "-", "…": "...", "•": "-",
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text.encode("latin-1", "replace").decode("latin-1")


def _mc(pdf: FPDF, h: float, text: str):
    """multi_cell wrapper — fpdf2 defaults new_x to XPos.RIGHT, which leaves
    the cursor at the right margin instead of resetting to the left margin,
    so every call after the first ends up with ~0 width to render into."""
    pdf.multi_cell(0, h, text, new_x="LMARGIN", new_y="NEXT")


def _write_markdown_line(pdf: FPDF, line: str):
    line = line.rstrip()
    if not line:
        pdf.ln(3)
        return

    for marker, size in (("### ", 12), ("## ", 13), ("# ", 15)):
        if line.startswith(marker):
            pdf.set_font("Helvetica", "B", size)
            _mc(pdf, 7, _sanitize(line[len(marker):]))
            pdf.set_font("Helvetica", "", 10)
            return

    bullet = line.startswith("- ") or line.startswith("* ")
    text = line[2:] if bullet else line
    # strip inline markdown emphasis — fpdf2 core fonts can't easily mix
    # styles mid-line, so render plain text rather than leak ** into output
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    _mc(pdf, 6, _sanitize(("-  " if bullet else "") + text))


def _write_field(pdf: FPDF, value):
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                line = " | ".join(f"{k}: {v}" for k, v in item.items())
                _mc(pdf, 6, _sanitize(f"-  {line}"))
            else:
                for line in str(item).split("\n"):
                    _write_markdown_line(pdf, line)
    elif isinstance(value, dict):
        for k, v in value.items():
            pdf.set_font("Helvetica", "B", 10)
            _mc(pdf, 6, _sanitize(f"{k.replace('_', ' ').title()}:"))
            pdf.set_font("Helvetica", "", 10)
            _write_field(pdf, v)
    else:
        for line in str(value).split("\n"):
            _write_markdown_line(pdf, line)


def render_document_pdf(data: dict, title: str) -> bytes:
    """Render an agent-drafted JSON object (outline/proposal/budget) into a
    readable PDF, instead of exposing the raw JSON blob for download."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    _mc(pdf, 10, _sanitize(title))
    pdf.ln(4)

    for key, value in data.items():
        pdf.set_font("Helvetica", "B", 13)
        _mc(pdf, 8, _sanitize(key.replace("_", " ").title()))
        pdf.ln(1)
        pdf.set_font("Helvetica", "", 10)
        _write_field(pdf, value)
        pdf.ln(4)

    return bytes(pdf.output())


def generate_grants_pdf(grants: dict, user_name: str) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, f"Grants Report", ln=True)
    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 8, user_name, ln=True)
    pdf.ln(5)

    categories = {
        "prime_match": "Prime Match",
        "moderate_fit": "Moderate Fit",
        "low_probability": "Low Probability"
    }

    for key, label in categories.items():
        items = grants.get(key, [])
        if not items:
            continue

        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 10, label, ln=True)
        pdf.set_font("Helvetica", size=10)

        for grant in items:
            pdf.cell(0, 7, f"Name: {grant.get('name', '—')}", ln=True)
            pdf.cell(0, 7, f"Amount: {grant.get('amount', '—')}", ln=True)
            pdf.cell(0, 7, f"Deadline: {grant.get('deadline', '—')}", ln=True)
            pdf.cell(0, 7, f"Link: {grant.get('link', '—')}", ln=True)
            pdf.ln(4)

    return bytes(pdf.output())