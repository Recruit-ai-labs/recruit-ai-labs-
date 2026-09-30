from pathlib import Path
from io import BytesIO
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.dml import MSO_THEME_COLOR
from pptx.enum.text import MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_CONNECTOR

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Recruit_AI_VC_Pitch_Deck.pptx"
ASSETS = ROOT / "public"

W, H = 13.333, 7.5
INK = "142B38"
TEAL = "168276"
MINT = "E7F2EF"
PALE = "F3F6F5"
WHITE = "FFFFFF"
SLATE = "607380"
LINE = "D9E4E3"
CORAL = "F1A78C"
AMBER = "E6C56E"
LILAC = "C9C3E8"
RED = "B64B55"

prs = Presentation()
prs.slide_width = Inches(W)
prs.slide_height = Inches(H)
prs.core_properties.title = "Recruit AI — VC Pitch Deck"
prs.core_properties.subject = "Evidence-led hiring infrastructure for recruitment teams"
prs.core_properties.author = "Recruit AI"
prs.core_properties.comments = "Investor placeholders are intentionally marked REPLACE BEFORE SENDING."

def rgb(hex_value):
    return RGBColor.from_string(hex_value)

def rect(slide, x, y, w, h, fill=WHITE, line=None, radius=True, transparency=0):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
                                   Inches(x), Inches(y), Inches(w), Inches(h))
    shape.fill.solid(); shape.fill.fore_color.rgb = rgb(fill); shape.fill.transparency = transparency
    shape.line.color.rgb = rgb(line or fill)
    return shape

def line(slide, x1, y1, x2, y2, color=LINE, width=1.2):
    sh = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    sh.line.color.rgb = rgb(color); sh.line.width = Pt(width)
    return sh

def text(slide, value, x, y, w, h, size=18, color=INK, bold=False, font="Aptos",
         align=PP_ALIGN.LEFT, valign=MSO_ANCHOR.TOP, margin=0, italic=False, tracking=None):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame; tf.clear(); tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = Inches(margin)
    tf.vertical_anchor = valign
    p = tf.paragraphs[0]; p.alignment = align
    r = p.add_run(); r.text = value
    r.font.name = font; r.font.size = Pt(size); r.font.bold = bold; r.font.italic = italic; r.font.color.rgb = rgb(color)
    if tracking is not None: r.font.spacing = Pt(tracking)
    return box

def rich(slide, runs, x, y, w, h, size=18, align=PP_ALIGN.LEFT, valign=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame; tf.clear(); tf.word_wrap = True; tf.vertical_anchor = valign
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]; p.alignment = align
    for value, opts in runs:
        r = p.add_run(); r.text = value; r.font.name = opts.get("font", "Aptos")
        r.font.size = Pt(opts.get("size", size)); r.font.bold = opts.get("bold", False)
        r.font.italic = opts.get("italic", False); r.font.color.rgb = rgb(opts.get("color", INK))
    return box

def title(slide, kicker, headline, sub=None, dark=False):
    base = WHITE if dark else INK; muted = "BFD3D0" if dark else SLATE
    text(slide, kicker.upper(), .65, .42, 5.8, .3, 10, TEAL if not dark else "70D0C1", True, tracking=1.2)
    text(slide, headline, .65, .86, 11.8, 1.15, 29, base, True)
    if sub: text(slide, sub, .67, 1.86, 11.2, .55, 13, muted)

def footer(slide, index, dark=False):
    color = "78918E" if dark else "8AA09E"
    text(slide, "RECRUIT AI  /  CONFIDENTIAL", .65, 7.13, 4.5, .2, 8, color, True, tracking=.7)
    text(slide, f"{index:02d}", 12.1, 7.1, .55, .22, 9, color, True, align=PP_ALIGN.RIGHT)

def new_slide(bg=PALE):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    s.background.fill.solid(); s.background.fill.fore_color.rgb = rgb(bg)
    return s

def pill(slide, value, x, y, w, fill=MINT, color=TEAL):
    rect(slide, x, y, w, .34, fill, fill)
    text(slide, value.upper(), x+.08, y+.075, w-.16, .16, 8, color, True, tracking=.6)

def card(slide, x, y, w, h, number, label, body, accent=TEAL):
    rect(slide, x, y, w, h, WHITE, LINE)
    text(slide, number, x+.25, y+.22, .55, .28, 11, accent, True)
    text(slide, label, x+.25, y+.7, w-.5, .42, 17, INK, True)
    text(slide, body, x+.25, y+1.22, w-.5, h-1.42, 11, SLATE)

def add_picture_crop(slide, path, x, y, w, h):
    # python-pptx keeps crop editable; calculate cover crop from source dimensions.
    from PIL import Image
    with Image.open(path) as im:
        iw, ih = im.size
        source_file = path
        if im.format not in {"BMP", "GIF", "JPEG", "PNG", "TIFF", "WMF"}:
            source_file = BytesIO()
            im.convert("RGB").save(source_file, format="PNG")
            source_file.seek(0)
    target = w / h; source = iw / ih
    pic = slide.shapes.add_picture(source_file if hasattr(source_file, "read") else str(source_file), Inches(x), Inches(y), width=Inches(w), height=Inches(h))
    if source > target:
        keep = target / source; pic.crop_left = pic.crop_right = (1 - keep) / 2
    elif source < target:
        keep = source / target; pic.crop_top = pic.crop_bottom = (1 - keep) / 2
    return pic

def placeholder(slide, label, value, x, y, w, h=.82):
    rect(slide, x, y, w, h, "FFF4DD", "E7C77B")
    text(slide, label.upper(), x+.18, y+.14, w-.36, .17, 8, "93671C", True, tracking=.5)
    text(slide, value, x+.18, y+.38, w-.36, .24, 14, INK, True)

# 01 — Cover
s = new_slide(INK)
add_picture_crop(s, ASSETS / "recruit-ai-hero.webp", 0, 0, W, 2.45)
overlay = rect(s, 0, 0, W, 2.48, INK, INK, False, 16)
logo = s.shapes.add_picture(str(ASSETS / "recruit-ai-logo.png"), Inches(.66), Inches(.55), width=Inches(.53), height=Inches(.53))
text(s, "RECRUIT AI", 1.32, .67, 2.5, .28, 12, WHITE, True, tracking=1.2)
pill(s, "Seed deck • 2026", .68, 2.88, 1.55, "21434E", "87D8CB")
rich(s, [("The evidence layer\n", {"size":34,"bold":True,"color":WHITE}),
         ("for modern hiring.", {"size":34,"bold":True,"color":"78D4C6"})], .68, 3.42, 8.2, 1.25)
text(s, "Turn a job description and resume stack into a reviewable shortlist — with the evidence behind every recommendation.", .72, 4.78, 7.3, .72, 16, "C7D8D6")
rect(s, 9.37, 3.22, 3.25, 2.85, "1D3945", "365561")
text(s, "THE WEDGE", 9.7, 3.58, 2.5, .25, 9, "76D3C5", True, tracking=1)
text(s, "JD", 9.7, 4.08, .65, .42, 22, WHITE, True)
text(s, "→", 10.49, 4.08, .35, .4, 18, "76D3C5", True)
text(s, "Evidence", 10.95, 4.08, 1.2, .42, 22, WHITE, True)
line(s, 9.7, 4.68, 12.25, 4.68, "43616A")
text(s, "A shared rubric. Inspectable quotes. Human decisions.", 9.7, 4.98, 2.45, .62, 12, "BFD3D0")
text(s, "Raipur, India  •  hello@recruitai.com", .72, 6.85, 5.0, .25, 9, "8FA7A4")

# 02 — Problem
s = new_slide(); title(s, "The problem", "Hiring teams don’t need more profiles.\nThey need decisions they can defend.", "The workflow breaks between the job brief, the resume stack and the final shortlist.")
card(s, .65, 2.65, 3.85, 3.35, "01", "Requirements drift", "Recruiters and clients interpret the same JD differently. Every reviewer creates a new, invisible rubric.", CORAL)
card(s, 4.73, 2.65, 3.85, 3.35, "02", "Evidence gets buried", "Keywords flatten context. The proof of delivery, scope and outcomes remains scattered across resumes and interviews.", AMBER)
card(s, 8.81, 2.65, 3.85, 3.35, "03", "Decisions lose context", "Shortlists move through spreadsheets and chat. Gaps, rationale and client feedback disappear between stages.", LILAC)
text(s, "Result: slow review, inconsistent shortlists and avoidable candidate waiting.", .68, 6.35, 11.9, .35, 15, INK, True, align=PP_ALIGN.CENTER)
footer(s, 2)

# 03 — Solution
s = new_slide(); title(s, "The solution", "One role. One rubric. Every candidate in context.", "Recruit AI converts role requirements into an evidence-led workflow that recruiters can inspect and control.")
steps = [("01","SELECT","A saved job description"),("02","SCREEN","A resume batch"),("03","REVIEW","Evidence and gaps"),("04","DECIDE","Human shortlist")]
for i,(n,l,b) in enumerate(steps):
    x=.65+i*3.05
    rect(s,x,2.55,2.72,2.05,WHITE,LINE)
    pill(s,n,x+.22,2.78,.52)
    text(s,l,x+.22,3.3,2.2,.22,10,TEAL,True,tracking=.8)
    text(s,b,x+.22,3.72,2.2,.48,16,INK,True)
    if i<3: text(s,"→",x+2.79,3.33,.25,.3,18,TEAL,True,align=PP_ALIGN.CENTER)
rect(s,.65,5.05,12.0,1.15,INK,INK)
text(s,"The product does not predict who gets hired.",.95,5.34,4.2,.27,14,WHITE,True)
text(s,"It makes the evidence, uncertainty and recruiter decision visible in one place.",5.15,5.32,7.0,.42,13,"C7D8D6")
footer(s,3)

# 04 — Product proof
s = new_slide(); title(s, "Product", "From resume stack to evidence board.", "A working product flow: select a saved JD, upload resumes, parse, inspect and export.")
rect(s,.65,2.38,8.35,4.25,WHITE,LINE)
add_picture_crop(s, ASSETS/"screen.png", .82, 2.58, 8.0, 3.8)
for y,label,copy in [(2.52,"SHARED RUBRIC","The same requirements across the batch"),(3.77,"VERIFIED EVIDENCE","Resume quotes beside every score"),(5.02,"RECRUITER CONTROL","Shortlist and export stay human-led")]:
    rect(s,9.33,y,3.33,.95,WHITE,LINE)
    text(s,label,9.58,y+.18,2.75,.16,8,TEAL,True,tracking=.6)
    text(s,copy,9.58,y+.46,2.72,.28,11,INK,True)
footer(s,4)

# 05 — Why now / insight
s = new_slide(INK); title(s,"Why now","AI made generation abundant.\nTrustworthy evidence is still scarce.","Recruiting software can generate copy, questions and scores. The enduring value is the reviewable chain from requirement to evidence to decision.",True)
for i,(head,body,accent) in enumerate([
    ("AI adoption","Automation is entering every recruiting workflow.","76D3C5"),
    ("Buyer scrutiny","Teams need explainable outputs and accountable review.","F1C890"),
    ("Fragmented stack","Screening, interviews and decisions still live in separate tools.","C9C3E8")]):
    x=.68+i*4.12
    rect(s,x,3.0,3.8,2.4,"1D3945","365561")
    text(s,f"0{i+1}",x+.28,3.28,.5,.25,10,accent,True)
    text(s,head,x+.28,3.85,3.05,.35,18,WHITE,True)
    text(s,body,x+.28,4.42,3.1,.65,12,"BFD3D0")
text(s,"Our thesis",.7,5.95,1.4,.25,10,"76D3C5",True,tracking=.8)
text(s,"The evidence graph becomes the system of record for hiring decisions.",2.04,5.83,10.0,.52,19,WHITE,True)
footer(s,5,True)

# 06 — Wedge & expansion
s = new_slide(); title(s,"Market wedge","Start where pain is frequent and proof matters.","Recommended ICP: Indian technical recruitment agencies managing multiple client roles.")
rect(s,.65,2.48,3.55,3.65,INK,INK)
text(s,"LAND",.94,2.82,1.1,.22,9,"76D3C5",True,tracking=1)
text(s,"Candidate evidence\nreview",.94,3.34,2.65,.85,23,WHITE,True)
text(s,"Clear role context, reviewable evidence, and a path to structured decisions.",.94,4.5,2.72,.72,12,"C7D8D6")
text(s,"01",3.45,5.57,.38,.25,10,"76D3C5",True)
for i,(name,body) in enumerate([
    ("INTERVIEWS","Close evidence gaps with role-specific questions."),
    ("DECISION ROOM","Compare candidates and preserve human rationale."),
    ("TALENT REDISCOVERY","Use approved role knowledge across future searches.")]):
    x=4.55+i*2.7
    rect(s,x,2.48,2.43,3.65,WHITE,LINE)
    text(s,f"0{i+2}",x+.22,2.79,.4,.22,9,TEAL,True)
    text(s,name,x+.22,3.36,1.95,.55,12,INK,True,tracking=.3)
    text(s,body,x+.22,4.16,1.95,1.05,11,SLATE)
    if i<2: text(s,"→",x+2.43,3.96,.27,.3,16,TEAL,True,align=PP_ALIGN.CENTER)
text(s,"Retention loop: new role → shortlist → client decision → approved role knowledge → faster next role",.68,6.48,11.9,.3,13,INK,True,align=PP_ALIGN.CENTER)
footer(s,6)

# 07 — Market model
s = new_slide(); title(s,"Market","A focused bottom-up market model.","Use verified customer counts and contract values before sending. This slide is structured for diligence, without fabricated TAM claims.")
placeholder(s,"Target agencies","[Insert verified count]",.65,2.55,3.62)
text(s,"×",4.42,2.78,.4,.3,20,TEAL,True,align=PP_ALIGN.CENTER)
placeholder(s,"Annual contract value","₹ [Insert validated ACV]",4.98,2.55,3.62)
text(s,"=",8.75,2.78,.4,.3,20,TEAL,True,align=PP_ALIGN.CENTER)
placeholder(s,"Initial serviceable market","₹ [Count × ACV]",9.31,2.55,3.35)
line(s,.65,3.8,12.65,3.8,LINE)
segments=[("BEACHHEAD","Indian technical recruitment agencies","Multi-client roles • repeat screening • client accountability"),
          ("EXPAND","In-house recruiting teams","Structured screening and interview evidence"),
          ("PLATFORM","Hiring ecosystem","ATS handoff • rediscovery • outcome learning")]
for i,(tag,name,body) in enumerate(segments):
    x=.65+i*4.08
    text(s,tag,x,4.23,1.2,.2,9,TEAL,True,tracking=.8)
    text(s,name,x,4.66,3.35,.42,16,INK,True)
    text(s,body,x,5.33,3.35,.65,11,SLATE)
footer(s,7)

# 08 — Competition
s = new_slide(); title(s,"Positioning","Win on reviewability, not feature count.","Established platforms cover broad ATS, CRM and analytics categories. Recruit AI begins with an evidence-first decision workflow.")
cols=[("",2.95),("Recruit AI",2.15),("ATS suites",2.15),("Sourcing platforms",2.15),("Manual workflow",2.15)]
x=.65
for label,w in cols:
    rect(s,x,2.42,w,.55,INK if label=="Recruit AI" else "E9EFEE",INK if label=="Recruit AI" else "E9EFEE",False)
    text(s,label,x+.08,2.59,w-.16,.18,9,WHITE if label=="Recruit AI" else INK,True,align=PP_ALIGN.CENTER)
    x+=w
rows=[("JD → shared evidence rubric",["●","○","○","○"]),
      ("Inspectable resume quotes",["●","◐","◐","○"]),
      ("Candidate comparison by evidence gaps",["●","◐","○","◐"]),
      ("Human decision trail",["●","●","◐","○"]),
      ("Broad ATS / CRM coverage",["○","●","●","○"])]
for ri,(label,vals) in enumerate(rows):
    y=3.02+ri*.61
    rect(s,.65,y,2.95,.57,WHITE,LINE,False); text(s,label,.82,y+.17,2.55,.2,10,INK,True)
    for ci,val in enumerate(vals):
        xx=3.6+ci*2.15; rect(s,xx,y,2.15,.57,MINT if ci==0 else WHITE,LINE,False)
        text(s,val,xx,y+.12,2.15,.25,15,TEAL if val=="●" else SLATE,True,align=PP_ALIGN.CENTER)
text(s,"● core strength   ◐ available / varies   ○ not the core workflow",.67,6.28,6.2,.23,9,SLATE)
text(s,"Qualitative founder view — validate through customer interviews and competitive demos.",7.07,6.28,5.55,.23,9,SLATE,italic=True,align=PP_ALIGN.RIGHT)
footer(s,8)

# 09 — Business model + unit economics
s = new_slide(); title(s,"Business model","Land with a role. Expand with the team.","A software-led model with clearly bounded usage, priced against recruiter time and provider cost.")
card(s,.65,2.55,3.75,2.35,"01","Single-role pilot","Paid, bounded engagement to prove the workflow on a live role and establish a baseline.",TEAL)
card(s,4.78,2.55,3.75,2.35,"02","Team subscription","Workspace, saved roles, screening, interviews, decision workflows and usage entitlements.",TEAL)
card(s,8.91,2.55,3.75,2.35,"03","Expansion","Seats, active roles, candidate volume and selected integrations grow with customer value.",TEAL)
placeholder(s,"Pilot price","₹ [Validate]",.65,5.32,2.8,.8)
placeholder(s,"Team ACV","₹ [Validate]",3.68,5.32,2.8,.8)
placeholder(s,"Gross margin","[Measure provider + storage cost]",6.71,5.32,2.8,.8)
placeholder(s,"Payback","[Measure sales cycle + CAC]",9.74,5.32,2.92,.8)
footer(s,9)

# 10 — GTM
s = new_slide(); title(s,"Go-to-market","Founder-led, workflow-specific and proof-driven.","The first sale is a measured pilot. The expansion motion begins after a client-ready shortlist is delivered.")
stages=[("01","DESIGN PARTNERS","Technical recruitment agencies","5 customer interviews → 2–3 live pilots"),
        ("02","PROVE VALUE","One real role and resume batch","Measure review time, acceptance and provider cost"),
        ("03","LAND & EXPAND","Convert pilot into team workspace","Add repeat roles, seats and client decision workflow"),
        ("04","DISTRIBUTE","Agency referrals + focused partnerships","Add first ATS handoff only after demand is clear")]
for i,(n,tag,head,body) in enumerate(stages):
    y=2.46+i*1.03
    pill(s,n,.66,y,.53)
    text(s,tag,1.42,y+.04,1.75,.2,9,TEAL,True,tracking=.6)
    text(s,head,3.22,y-.02,3.15,.31,15,INK,True)
    text(s,body,6.65,y-.02,5.35,.43,12,SLATE)
    if i<3: line(s,.92,y+.4,.92,y+.92,"B9CFCA",1.5)
rect(s,.65,6.62,12.0,.42,MINT,MINT)
text(s,"North-star activation: first reviewed shortlist from a live role — measured, not promised.",.92,6.73,11.45,.18,10,TEAL,True,align=PP_ALIGN.CENTER)
footer(s,10)

# 11 — Progress / roadmap
s = new_slide(); title(s,"Progress","The product exists. Now prove repeatable value.","Current product capabilities are shown separately from investor metrics that still need founder validation.")
rect(s,.65,2.48,5.7,3.85,WHITE,LINE)
text(s,"PRODUCT BUILT",.95,2.8,2.0,.2,9,TEAL,True,tracking=.8)
built=["Candidate profiles and role pipelines","Evidence quotes and coverage gaps","Structured interview responses","Decision Room comparison workflow","Workspace roles, vetting and export"]
for i,item in enumerate(built):
    text(s,"✓",.98,3.34+i*.52,.28,.22,12,TEAL,True)
    text(s,item,1.37,3.32+i*.52,4.45,.28,12,INK,True)
rect(s,6.65,2.48,6.0,3.85,INK,INK)
text(s,"12-MONTH PROOF PLAN",6.96,2.8,2.2,.2,9,"76D3C5",True,tracking=.8)
milestones=[("Q1","Design partners + instrumented pilots"),("Q2","Pilot conversion + saved screening runs"),("Q3","Repeat-role retention + ATS handoff"),("Q4","Outcome reporting + repeatable sales motion")]
for i,(q,item) in enumerate(milestones):
    y=3.34+i*.63
    text(s,q,6.96,y,.55,.22,10,"76D3C5",True)
    text(s,item,7.68,y,4.35,.27,12,WHITE,True)
placeholder(s,"Traction","[Customers / pilots / revenue]",.66,6.53,3.74,.48)
placeholder(s,"Usage","[Roles / resumes / interviews]",4.77,6.53,3.74,.48)
placeholder(s,"Retention","[W4 / repeat-role rate]",8.9,6.53,3.74,.48)
footer(s,11)

# 12 — Team & ask
s = new_slide(INK)
title(s,"The round","Build the evidence infrastructure\nbehind every hiring decision.",None,True)
add_picture_crop(s,ASSETS/"recruit-ai-founder.webp",.68,2.28,2.25,2.66)
rect(s,.68,4.72,2.25,.72,"1D3945","365561")
text(s,"FOUNDER",.9,4.89,.65,.18,8,"76D3C5",True,tracking=.8)
text(s,"[Add name + relevant proof]",.9,5.12,1.8,.2,10,WHITE,True)
text(s,"Raipur, India",.7,5.68,2.2,.2,10,"9CB4B1")
placeholder(s,"Raising","₹ / $ [Insert round]",3.48,2.48,2.77,.88)
placeholder(s,"Runway","[Insert months]",6.48,2.48,2.77,.88)
placeholder(s,"Target close","[Insert date]",9.48,2.48,2.77,.88)
uses=[("45%","PRODUCT","Saved runs, integrations, quality measurement"),
      ("35%","GO-TO-MARKET","Design partners, founder-led sales, case studies"),
      ("20%","TRUST & OPS","Security, privacy, reliability and support")]
for i,(pct,tag,body) in enumerate(uses):
    x=3.48+i*3.0
    rect(s,x,3.75,2.77,1.72,"1D3945","365561")
    text(s,pct,x+.2,4.0,.75,.3,20,"76D3C5",True)
    text(s,tag,x+.2,4.43,2.15,.2,9,WHITE,True,tracking=.6)
    text(s,body,x+.2,4.78,2.25,.45,10,"BFD3D0")
text(s,"Let’s make every shortlist explainable.",3.48,6.08,7.2,.45,22,WHITE,True)
text(s,"hello@recruitai.com",3.5,6.62,4.0,.25,11,"76D3C5",True)
footer(s,12,True)

# Set all slides to no transition-like timing and remove default metadata placeholders.
prs.save(OUT)
print(OUT)
