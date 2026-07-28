from fpdf import FPDF

def generate_grants_pdf(grants: dict, user_name: str) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, f"Grants Report", ln=True)
    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 8, user_name, ln=True)
    pdf.ln(5)

    categories = {
        "recommended": "Recommended",
        "strong_fit": "Strong Fit",
        "not_qualified": "Not Qualified"
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