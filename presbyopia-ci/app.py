import re
from datetime import date

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from data_products import (DRUGS, DRUG_ORDER, PKPD_STUDIES, PATENTS,
                           MARKET_GLOBAL, MARKET_KOREA)
import data_intel as I

# ─────────────────────────────────────────────
# PAGE CONFIG
# ─────────────────────────────────────────────
st.set_page_config(
    page_title="Presbyopia Drops – Competitor Intelligence",
    page_icon="💧",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────────────────────────
# PALETTE (validated categorical order + status colours, light surface)
# ─────────────────────────────────────────────
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"]
INK, INK2, MUTED, GRID, AXIS, SURFACE = "#0b0b0b", "#52514e", "#898781", "#e1e0d9", "#c3c2b7", "#fcfcfb"
STATUS = {"good": "#0ca30c", "warning": "#fab219", "serious": "#ec835a", "critical": "#d03b3b"}
# Colour follows the product, never its rank
PRODUCT_COLOR = {k: SERIES[i] for i, k in enumerate(DRUG_ORDER)}
REGION_COLOR = {"Korea": SERIES[0], "Global": SERIES[1]}
SEQ_BLUE = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"]

THREAT_LABEL = {5: "Critical", 4: "High", 3: "Medium", 2: "Low", 1: "Minimal"}
THREAT_STATUS = {5: "critical", 4: "serious", 3: "warning", 2: "good", 1: "good"}
THREAT_ICON = {5: "▲▲", 4: "▲", 3: "◆", 2: "▽", 1: "▽"}

# ─────────────────────────────────────────────
# CSS — LIGHT THEME
# ─────────────────────────────────────────────
st.markdown("""
<style>
html,body,[class*="css"]{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;}
[data-testid="stSidebar"]{background:#f4f4f1;border-right:1px solid #e1e0d9;}
.block-container{padding-top:1.6rem;}

.page-header{font-size:12px;color:#898781;letter-spacing:.06em;text-transform:uppercase;margin-bottom:2px;}
.lede{font-size:15px;color:#52514e;line-height:1.6;max-width:980px;margin-bottom:10px;}
.source-note{font-size:11px;color:#898781;font-style:italic;}

.badge{display:inline-block;font-size:11px;font-weight:600;padding:3px 10px;
  border-radius:20px;margin-right:6px;margin-bottom:4px;letter-spacing:.02em;border:1px solid transparent;}
.b-ok{background:#e9f7e9;color:#006300;border-color:#bfe5bf;}
.b-warn{background:#fff6e0;color:#7a5200;border-color:#f6d98c;}
.b-crit{background:#fdeceb;color:#9b1c1c;border-color:#f3c0bf;}
.b-info{background:#e8f0fb;color:#1c5cab;border-color:#b7d3f6;}
.b-mute{background:#f0efec;color:#52514e;border-color:#e1e0d9;}

.kpi{background:#fff;border:1px solid #e1e0d9;border-radius:12px;padding:16px 18px;height:100%;}
.kpi-label{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#898781;}
.kpi-num{font-size:30px;font-weight:700;color:#0b0b0b;line-height:1.15;margin-top:4px;}
.kpi-sub{font-size:12px;color:#52514e;margin-top:4px;line-height:1.45;}

.info-card{background:#fff;border:1px solid #e1e0d9;border-radius:10px;
  padding:14px 16px;margin-bottom:12px;}
.info-card-title{font-size:10px;font-weight:700;letter-spacing:.09em;
  text-transform:uppercase;color:#898781;margin-bottom:6px;}
.info-card-value{font-size:14px;color:#2b2b29;line-height:1.6;}
.info-card-value b{color:#0b0b0b;font-weight:600;}
.hl{color:#006300;font-weight:600;} .warn{color:#7a5200;font-weight:600;} .danger{color:#9b1c1c;font-weight:600;}

.co-card{background:#fff;border:1px solid #e1e0d9;border-radius:12px;padding:16px 18px;margin-bottom:14px;}
.co-card.focus{border:2px solid #2a78d6;box-shadow:0 2px 10px rgba(42,120,214,.10);}
.co-name{font-size:18px;font-weight:700;color:#0b0b0b;margin:0;}
.co-ko{font-size:13px;color:#898781;margin-left:6px;font-weight:500;}
.co-row{font-size:13px;color:#2b2b29;line-height:1.6;margin-top:6px;}
.co-row b{color:#0b0b0b;}

.alert{border-left:4px solid #2a78d6;background:#fff;border-radius:6px;padding:10px 14px;margin-bottom:8px;
  border-top:1px solid #e1e0d9;border-right:1px solid #e1e0d9;border-bottom:1px solid #e1e0d9;}
.alert-date{font-size:11px;font-weight:700;color:#898781;letter-spacing:.04em;}
.alert-text{font-size:14px;color:#0b0b0b;line-height:1.5;margin-top:2px;}
.alert-impact{font-size:12px;color:#52514e;margin-top:3px;}

.tbl{width:100%;border-collapse:collapse;font-size:13px;}
.tbl th{background:#f4f4f1;color:#52514e;font-size:10px;font-weight:700;letter-spacing:.06em;
  text-transform:uppercase;padding:9px 10px;text-align:left;border-bottom:1.5px solid #c3c2b7;}
.tbl td{padding:8px 10px;color:#2b2b29;border-bottom:1px solid #e1e0d9;vertical-align:top;line-height:1.5;}
.tbl td b{color:#0b0b0b;}
.tbl a{color:#1c5cab;text-decoration:none;}

.trial-box{background:#f5f8fd;border:1px solid #cde2fb;border-left:4px solid #2a78d6;
  border-radius:8px;padding:12px 14px;margin-bottom:10px;}
.trial-box-title{font-size:13px;font-weight:700;color:#104281;margin-bottom:4px;}
.trial-box-body{font-size:13px;color:#2b2b29;line-height:1.6;}

.tl-row{display:flex;gap:14px;align-items:flex-start;margin-bottom:9px;}
.tl-date{flex-shrink:0;width:96px;font-size:11px;font-weight:700;color:#52514e;padding-top:3px;}
.tl-dot{flex-shrink:0;width:10px;height:10px;border-radius:50%;margin-top:6px;}
.tl-text{font-size:13px;color:#2b2b29;line-height:1.5;}
.tl-tag{font-size:10px;font-weight:700;color:#898781;letter-spacing:.05em;text-transform:uppercase;margin-right:6px;}
</style>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def html(s):
    st.markdown(s, unsafe_allow_html=True)


def badge(text, cls="b-mute"):
    return f'<span class="badge {cls}">{text}</span>'


def info_card(title, body):
    return (f'<div class="info-card"><div class="info-card-title">{title}</div>'
            f'<div class="info-card-value">{body}</div></div>')


def kpi(label, num, sub=""):
    return (f'<div class="kpi"><div class="kpi-label">{label}</div>'
            f'<div class="kpi-num">{num}</div><div class="kpi-sub">{sub}</div></div>')


def threat_badge(level):
    cls = {"critical": "b-crit", "serious": "b-crit", "warning": "b-warn", "good": "b-ok"}[THREAT_STATUS[level]]
    return badge(f"{THREAT_ICON[level]} Threat: {THREAT_LABEL[level]}", cls)


def conf_badge(conf):
    return badge(conf, {"Verified": "b-ok", "Reported": "b-info", "Estimate": "b-warn",
                        "Unverified": "b-crit"}.get(conf, "b-mute"))


def src_links(sources, limit=None):
    if not sources:
        return ""
    out = []
    for s in sources[:limit] if limit else sources:
        if isinstance(s, (list, tuple)):
            label, url = s
        else:
            label, url = (re.sub(r"^https?://(www\.)?", "", s).split("/")[0], s)
        out.append(f'<a href="{url}" target="_blank">{label} ↗</a>')
    return " · ".join(out)


def trial_box(t):
    return (f'<div class="trial-box"><div class="trial-box-title">{t["name"]}</div>'
            f'<div class="trial-box-body"><b>Citation:</b> {t["citation"]}<br>'
            f'<b>Design:</b> {t["design"]}<br>'
            f'<b>Primary endpoint:</b> {t["primary_endpoint"]}<br>'
            f'<b>Result:</b> {t["result"]}</div></div>')


def style_fig(fig, height=360, legend=True):
    fig.update_layout(
        height=height, margin=dict(l=10, r=20, t=30, b=10),
        paper_bgcolor=SURFACE, plot_bgcolor=SURFACE,
        font=dict(family="system-ui, -apple-system, Segoe UI, sans-serif", size=12, color=INK2),
        showlegend=legend,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0, title_text=""),
        hoverlabel=dict(bgcolor="#ffffff", bordercolor=AXIS, font=dict(color=INK, size=12)),
        bargap=0.35,
    )
    fig.update_xaxes(gridcolor=GRID, linecolor=AXIS, zeroline=False, tickfont=dict(color=MUTED))
    fig.update_yaxes(gridcolor=GRID, linecolor=AXIS, zeroline=False, tickfont=dict(color=MUTED))
    return fig


def plot(fig):
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})


def to_date(s):
    """Parse 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD' into a date (first of period)."""
    if not s:
        return None
    parts = [int(p) for p in str(s).split("-")]
    while len(parts) < 3:
        parts.append(1)
    return date(*parts[:3])


STAGE_ORDER = I.STAGE_ORDER


# ─────────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────────
VIEWS = [
    "🧭 Executive Brief",
    "🌍 Competitor Landscape",
    "🇰🇷 Korea Battleground",
    "🧪 Global Pipeline",
    "📊 Head-to-Head",
    "🤝 Deals & Licensing",
    "📜 IP & Exclusivity",
    "📈 Market",
    "💊 Product Deep-Dive",
    "🔬 PK/PD Evidence",
    "📚 Sources & Method",
]
with st.sidebar:
    st.markdown("### 💧 Presbyopia Eye Drops\n**Competitor Intelligence**")
    st.caption(f"Global + Korea · data as of {I.AS_OF_LABEL}")
    st.markdown("---")
    view = st.radio("View", VIEWS, label_visibility="collapsed")
    if view == "💊 Product Deep-Dive":
        st.markdown("---")
        selected_drug = st.radio("Product", DRUG_ORDER, label_visibility="collapsed",
                                 format_func=lambda x: f"{DRUGS[x]['brand'].replace('®','').replace('™','')}")
    st.markdown("---")
    st.caption("Confidence tags: **Verified** = primary source (FDA, MFDS, company filing/PR). "
               "**Reported** = trade press. **Estimate** = derived. **Unverified** = single/indirect source.")


# ═════════════════════════════════════════════
# VIEW: EXECUTIVE BRIEF
# ═════════════════════════════════════════════
if view == "🧭 Executive Brief":
    html('<p class="page-header">Executive Brief</p>')
    st.markdown("## Presbyopia eye-drop competitor intelligence")
    html(f'<p class="lede">{I.EXEC_SUMMARY}</p>')

    cols = st.columns(len(I.KPIS))
    for c, k in zip(cols, I.KPIS):
        c.markdown(kpi(k["label"], k["num"], k["sub"]), unsafe_allow_html=True)

    st.markdown("")
    left, right = st.columns([1.15, 0.85])
    with left:
        st.markdown("#### Competitive threat map")
        st.caption("Threat to a new entrant in Korea. X = commercial readiness (stage); "
                   "Y = assessed threat (1–5). Bubble size = ophthalmic franchise strength.")
        df = pd.DataFrame([c for c in I.COMPETITORS if c.get("threat")])
        df["readiness"] = df["stage"].map(I.STAGE_READINESS)
        # Deterministic jitter so overlapping labels separate
        df["x"] = df["readiness"] + (df.index % 3 - 1) * 0.18
        df["y"] = df["threat"] + ((df.index // 3) % 3 - 1) * 0.16
        fig = go.Figure()
        for region in ["Korea", "Global"]:
            sub = df[df["scope"] == region]
            fig.add_trace(go.Scatter(
                x=sub["x"], y=sub["y"], mode="markers+text", name=f"{region} player",
                text=sub["short"], textposition="top center", textfont=dict(size=11, color=INK),
                marker=dict(size=sub["franchise"].fillna(2) * 7 + 8, color=REGION_COLOR[region],
                            opacity=0.85, line=dict(color=SURFACE, width=2),
                            symbol="circle" if region == "Korea" else "diamond"),
                customdata=sub[["product", "company", "stage", "threat_why"]].values,
                hovertemplate="<b>%{customdata[0]}</b> · %{customdata[1]}<br>Stage: %{customdata[2]}"
                              "<br>%{customdata[3]}<extra></extra>",
            ))
        fig.update_xaxes(range=[0.3, 6.7], tickvals=list(I.READINESS_TICKS.keys()),
                         ticktext=list(I.READINESS_TICKS.values()), title_text="Commercial readiness →")
        fig.update_yaxes(range=[0.4, 5.7], tickvals=[1, 2, 3, 4, 5],
                         ticktext=["Minimal", "Low", "Medium", "High", "Critical"], title_text="Threat")
        plot(style_fig(fig, height=470))
    with right:
        st.markdown(f"#### What changed since your June 2026 build")
        for a in I.CHANGES_SINCE_JUNE:
            color = {"up": STATUS["critical"], "down": STATUS["good"], "info": SERIES[0]}.get(a.get("dir"), SERIES[0])
            html(f'<div class="alert" style="border-left-color:{color}"><div class="alert-date">{a["date"]}</div>'
                 f'<div class="alert-text">{a["headline"]}</div>'
                 f'<div class="alert-impact">{a["impact"]} {src_links(a.get("sources"), 2)}</div></div>')

    st.markdown("---")
    st.markdown("#### Strategic takeaways")
    tcols = st.columns(3)
    for i, t in enumerate(I.TAKEAWAYS):
        tcols[i % 3].markdown(info_card(t["title"], t["body"]), unsafe_allow_html=True)


# ═════════════════════════════════════════════
# VIEW: COMPETITOR LANDSCAPE
# ═════════════════════════════════════════════
elif view == "🌍 Competitor Landscape":
    html('<p class="page-header">Competitor Landscape · Global + Local</p>')
    st.markdown("## Who is competing, with what, and how far along")

    f1, f2, f3, f4 = st.columns([1, 1.4, 1.4, 1])
    scope_f = f1.multiselect("Scope", ["Korea", "Global"], default=["Korea", "Global"])
    stages_present = [s for s in STAGE_ORDER if any(c["stage"] == s for c in I.COMPETITORS)]
    stage_f = f2.multiselect("Highest stage", stages_present, default=stages_present)
    mechs = sorted({c["mechanism"] for c in I.COMPETITORS})
    mech_f = f3.multiselect("Mechanism", mechs, default=mechs)
    active_only = f4.toggle("Hide discontinued", value=False)

    rows = [c for c in I.COMPETITORS if c["scope"] in scope_f and c["stage"] in stage_f
            and c["mechanism"] in mech_f and not (active_only and c["stage"] == "Discontinued")]
    st.caption(f"{len(rows)} of {len(I.COMPETITORS)} assets shown")

    c1, c2 = st.columns([1, 1])
    with c1:
        st.markdown("#### Assets by highest stage")
        counts = pd.DataFrame(rows).groupby(["stage", "scope"]).size().reset_index(name="n") if rows else pd.DataFrame(columns=["stage", "scope", "n"])
        fig = go.Figure()
        for region in ["Global", "Korea"]:
            sub = counts[counts["scope"] == region].set_index("stage").reindex(stages_present).fillna(0)
            fig.add_trace(go.Bar(y=stages_present, x=sub["n"], name=region, orientation="h",
                                 marker=dict(color=REGION_COLOR[region], line=dict(color=SURFACE, width=2)),
                                 hovertemplate="%{y}: %{x} " + region + " asset(s)<extra></extra>"))
        fig.update_layout(barmode="stack")
        fig.update_yaxes(autorange="reversed")
        fig.update_xaxes(dtick=1, title_text="Assets")
        plot(style_fig(fig, height=330))
    with c2:
        st.markdown("#### Assets by mechanism")
        mc = pd.Series([c["mechanism"] for c in rows]).value_counts().sort_values() if rows else pd.Series(dtype=int)
        fig = go.Figure(go.Bar(y=mc.index, x=mc.values, orientation="h",
                               marker=dict(color=SERIES[0], line=dict(color=SURFACE, width=2)),
                               text=mc.values, textposition="outside",
                               hovertemplate="%{y}: %{x}<extra></extra>"))
        fig.update_xaxes(dtick=1, title_text="Assets")
        plot(style_fig(fig, height=330, legend=False))

    st.markdown("#### Competitor table")
    table = pd.DataFrame([{
        "Product / asset": c["product"], "Company": c["company"], "Scope": c["scope"],
        "API": c["api"], "Mechanism": c["mechanism"], "Highest stage": c["stage"],
        "US status": c.get("us_status", "—"), "Korea status": c.get("kr_status", "—"),
        "Duration": c.get("duration", "—"), "Next milestone": c.get("next_milestone", "—"),
        "Threat": THREAT_LABEL.get(c.get("threat"), "—"), "Confidence": c.get("confidence", "—"),
    } for c in rows])
    if not table.empty:
        table["_s"] = table["Highest stage"].map({s: i for i, s in enumerate(STAGE_ORDER)})
        table = table.sort_values(["_s", "Scope"]).drop(columns="_s")
    st.dataframe(table, use_container_width=True, hide_index=True, height=min(60 + 36 * len(table), 640))
    st.download_button("Download table (CSV)", table.to_csv(index=False).encode("utf-8-sig"),
                       "presbyopia_competitors.csv", "text/csv")

    st.markdown("#### Competitor profiles")
    for c in sorted(rows, key=lambda c: (-(c.get("threat") or 0), STAGE_ORDER.index(c["stage"]))):
        with st.expander(f'{c["product"]} — {c["company"]}  ·  {c["stage"]}'):
            html(badge(c["scope"], "b-info") + badge(c["mechanism"]) +
                 (threat_badge(c["threat"]) if c.get("threat") else "") + conf_badge(c.get("confidence", "Reported")))
            a, b = st.columns(2)
            a.markdown(info_card("API & formulation", f'{c["api"]}<br><span style="color:#52514e">{c.get("formulation","")}</span>'), unsafe_allow_html=True)
            a.markdown(info_card("Regulatory status", f'<b>US:</b> {c.get("us_status","—")}<br><b>Korea:</b> {c.get("kr_status","—")}<br><b>Other:</b> {c.get("other_status","—")}'), unsafe_allow_html=True)
            b.markdown(info_card("Differentiator", c.get("differentiator", "—")), unsafe_allow_html=True)
            b.markdown(info_card("Weakness / risk", c.get("weakness", "—")), unsafe_allow_html=True)
            if c.get("threat_why"):
                st.markdown(info_card("Threat rationale", c["threat_why"]), unsafe_allow_html=True)
            html(f'<p class="source-note">Next milestone: {c.get("next_milestone","—")} · Sources: {src_links(c.get("sources"))}</p>')


# ═════════════════════════════════════════════
# VIEW: KOREA BATTLEGROUND
# ═════════════════════════════════════════════
elif view == "🇰🇷 Korea Battleground":
    html('<p class="page-header">Korea Battleground · 국내 노안 점안제 경쟁</p>')
    st.markdown("## The Korean presbyopia-drop race")
    html(f'<p class="lede">{I.KOREA_SUMMARY}</p>')

    cols = st.columns(len(I.KOREA_KPIS))
    for c, k in zip(cols, I.KOREA_KPIS):
        c.markdown(kpi(k["label"], k["num"], k["sub"]), unsafe_allow_html=True)

    st.markdown("#### MFDS race — license → filing → approval → launch")
    st.caption("Solid segments = confirmed dates; light segments = expected/estimated. Hover for detail.")
    fig = go.Figure()
    today = to_date(I.AS_OF)
    phase_style = {"License → NDA": (SEQ_BLUE[2], 1.0), "NDA review": (SEQ_BLUE[4], 1.0),
                   "Expected review": (SEQ_BLUE[1], 1.0), "Development": (SEQ_BLUE[3], 1.0),
                   "Expected development": (SEQ_BLUE[1], 1.0), "On market": ("#0ca30c", 1.0),
                   "Expected launch": ("#bfe5bf", 1.0)}
    shown = set()
    labels = [f'{r["product"]} · {r["company"]}' for r in I.KOREA_RACE]
    for r, lab in zip(I.KOREA_RACE, labels):
        for seg in r["segments"]:
            s, e = to_date(seg["start"]), to_date(seg["end"])
            color, _ = phase_style[seg["phase"]]
            fig.add_trace(go.Bar(
                y=[lab], x=[(e - s).days * 86400000], base=[s.isoformat()], orientation="h",
                name=seg["phase"], showlegend=seg["phase"] not in shown, legendgroup=seg["phase"],
                marker=dict(color=color, line=dict(color=SURFACE, width=2)),
                hovertemplate=f'<b>{lab}</b><br>{seg["phase"]}: {seg["start"]} → {seg["end"]}'
                              f'<br>{seg.get("note","")}<extra></extra>'))
            shown.add(seg["phase"])
        for m in r.get("milestones", []):
            fig.add_trace(go.Scatter(
                y=[lab], x=[to_date(m["date"]).isoformat()], mode="markers", showlegend=False,
                marker=dict(symbol="diamond", size=11, color=INK, line=dict(color=SURFACE, width=2)),
                hovertemplate=f'<b>{m["label"]}</b><br>{m["date"]}<extra></extra>'))
    fig.add_vline(x=today.isoformat(), line=dict(color=STATUS["critical"], width=1.5, dash="dot"))
    fig.add_annotation(x=today.isoformat(), y=1.0, yref="paper", text="Today", showarrow=False,
                       font=dict(color=STATUS["critical"], size=11), yanchor="bottom")
    fig.update_layout(barmode="overlay")
    fig.update_xaxes(type="date", range=["2023-10-01", "2029-12-31"])
    fig.update_yaxes(autorange="reversed")
    plot(style_fig(fig, height=90 + 46 * len(I.KOREA_RACE)))

    st.markdown("---")
    st.markdown("#### Company profiles")
    st.caption("Sorted by assessed threat. Taejoon Pharm is highlighted as the domestic ophthalmology incumbent you flagged.")
    for p in sorted(I.KOREA_COMPANIES, key=lambda p: -p["threat"]):
        focus = " focus" if p.get("focus") else ""
        rows_html = "".join(f'<div class="co-row"><b>{k}:</b> {v}</div>' for k, v in p["facts"])
        html(f'<div class="co-card{focus}"><p class="co-name">{p["company"]}<span class="co-ko">{p["company_ko"]}</span></p>'
             f'<div style="margin-top:6px">{badge(p["role"], "b-info")}{threat_badge(p["threat"])}{conf_badge(p.get("confidence","Reported"))}</div>'
             f'{rows_html}'
             f'<div class="co-row" style="margin-top:8px"><b>Threat rationale:</b> {p["threat_why"]}</div>'
             f'<div class="source-note" style="margin-top:6px">{src_links(p.get("sources"))}</div></div>')

    st.markdown("---")
    c1, c2 = st.columns([1, 1])
    with c1:
        st.markdown("#### License chains into Korea")
        for ch in I.LICENSE_CHAINS:
            html(info_card(ch["product"], " → ".join(f"<b>{x}</b>" for x in ch["chain"]) +
                           f'<br><span style="color:#52514e;font-size:12px">{ch["note"]}</span>'))
    with c2:
        st.markdown("#### Korea timeline")
        for e in sorted([e for e in I.EVENTS if e["region"] == "Korea"], key=lambda e: e["date"]):
            dot = {"Approval": STATUS["good"], "Filing": SERIES[0], "Deal": SERIES[1], "Launch": STATUS["good"],
                   "Trial": SERIES[6], "Corporate": MUTED}.get(e["type"], MUTED)
            html(f'<div class="tl-row"><div class="tl-date">{e["date"]}</div><div class="tl-dot" style="background:{dot}"></div>'
                 f'<div class="tl-text"><span class="tl-tag">{e["type"]}</span>{e["text"]}</div></div>')


# ═════════════════════════════════════════════
# VIEW: GLOBAL PIPELINE
# ═════════════════════════════════════════════
elif view == "🧪 Global Pipeline":
    html('<p class="page-header">Global Pipeline · next-wave threats</p>')
    st.markdown("## Clinical pipeline beyond the approved five")
    html(f'<p class="lede">{I.PIPELINE_SUMMARY}</p>')

    pipe = [c for c in I.COMPETITORS if c["stage"] not in ("Approved (US)",)]
    region_f = st.multiselect("Developer region", sorted({c["origin"] for c in pipe}),
                              default=sorted({c["origin"] for c in pipe}))
    pipe = [c for c in pipe if c["origin"] in region_f]

    c1, c2 = st.columns([1, 1])
    with c1:
        st.markdown("#### Pipeline by stage")
        order = [s for s in STAGE_ORDER if s != "Approved (US)"]
        cnt = pd.Series([c["stage"] for c in pipe]).value_counts().reindex(order).fillna(0)
        cnt = cnt[cnt > 0]
        fig = go.Figure(go.Bar(y=cnt.index, x=cnt.values, orientation="h",
                               marker=dict(color=[STATUS["critical"] if s == "Discontinued" else SERIES[0] for s in cnt.index],
                                           line=dict(color=SURFACE, width=2)),
                               text=cnt.values.astype(int), textposition="outside",
                               hovertemplate="%{y}: %{x}<extra></extra>"))
        fig.update_yaxes(autorange="reversed")
        fig.update_xaxes(dtick=1)
        plot(style_fig(fig, height=300, legend=False))
    with c2:
        st.markdown("#### Pipeline by developer region")
        rc = pd.Series([c["origin"] for c in pipe]).value_counts().sort_values()
        fig = go.Figure(go.Bar(y=rc.index, x=rc.values, orientation="h",
                               marker=dict(color=SERIES[0], line=dict(color=SURFACE, width=2)),
                               text=rc.values, textposition="outside", hovertemplate="%{y}: %{x}<extra></extra>"))
        fig.update_xaxes(dtick=1)
        plot(style_fig(fig, height=300, legend=False))

    st.markdown("#### Pipeline detail")
    html('<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Asset</th><th>Company · origin</th>'
         '<th>API / mechanism</th><th>Stage</th><th>Latest data / status</th><th>Next milestone</th><th>Sources</th></tr></thead><tbody>' +
         "".join(f'<tr><td><b>{c["product"]}</b><br>{conf_badge(c.get("confidence","Reported"))}</td>'
                 f'<td>{c["company"]}<br><span style="color:#898781">{c["origin"]}</span></td>'
                 f'<td>{c["api"]}<br><span style="color:#898781">{c["mechanism"]}</span></td>'
                 f'<td>{badge(c["stage"], "b-crit" if c["stage"]=="Discontinued" else "b-info")}</td>'
                 f'<td>{c.get("latest","—")}</td><td>{c.get("next_milestone","—")}</td>'
                 f'<td style="font-size:11px">{src_links(c.get("sources"), 3)}</td></tr>'
                 for c in sorted(pipe, key=lambda c: STAGE_ORDER.index(c["stage"]))) +
         '</tbody></table></div>')


# ═════════════════════════════════════════════
# VIEW: HEAD-TO-HEAD
# ═════════════════════════════════════════════
elif view == "📊 Head-to-Head":
    html('<p class="page-header">Head-to-Head Benchmarking · approved & filed products</p>')
    st.markdown("## Clinical profile benchmarking")
    st.warning("Cross-trial comparison: endpoints, timepoints, populations and lighting conditions differ between "
               "programmes. Use for positioning, not for efficacy claims.", icon="⚠️")
    h = pd.DataFrame(I.HEAD2HEAD)

    c1, c2 = st.columns(2)
    with c1:
        st.markdown("#### Pivotal responder rate vs vehicle")
        st.caption("% achieving ≥3-line near-vision gain (composite) at the pivotal primary timepoint")
        fig = go.Figure()
        fig.add_trace(go.Bar(y=h["product"], x=h["responder_pct"], name="Active", orientation="h",
                             marker=dict(color=SERIES[0], line=dict(color=SURFACE, width=2)),
                             customdata=h[["trial", "timepoint"]].values,
                             text=[f"{v:g}%" for v in h["responder_pct"]], textposition="outside",
                             hovertemplate="<b>%{y}</b> active: %{x}%<br>%{customdata[0]} · %{customdata[1]}<extra></extra>"))
        fig.add_trace(go.Bar(y=h["product"], x=h["vehicle_pct"], name="Vehicle / placebo", orientation="h",
                             marker=dict(color="#c3c2b7", line=dict(color=SURFACE, width=2)),
                             text=[f"{v:g}%" for v in h["vehicle_pct"]], textposition="outside",
                             hovertemplate="<b>%{y}</b> vehicle: %{x}%<extra></extra>"))
        fig.update_layout(barmode="group")
        fig.update_yaxes(autorange="reversed")
        fig.update_xaxes(range=[0, 100], ticksuffix="%")
        plot(style_fig(fig, height=380))
    with c2:
        st.markdown("#### Labelled / reported duration of effect")
        st.caption("Hours of near-vision benefit per dose (label or pivotal data)")
        fig = go.Figure(go.Bar(y=h["product"], x=h["duration_h"], orientation="h",
                               marker=dict(color=[PRODUCT_COLOR.get(k, SERIES[0]) for k in h["key"]],
                                           line=dict(color=SURFACE, width=2)),
                               text=[f"{v:g} h" for v in h["duration_h"]], textposition="outside",
                               hovertemplate="<b>%{y}</b>: up to %{x} h<extra></extra>"))
        fig.update_yaxes(autorange="reversed")
        fig.update_xaxes(range=[0, 24], ticksuffix=" h")
        plot(style_fig(fig, height=380, legend=False))

    st.markdown("#### Tolerability signals (pivotal trial rates)")
    ae_cols = [c for c in h.columns if c.startswith("ae_")]
    sel = st.selectbox("Adverse event", ae_cols, format_func=lambda c: I.AE_LABELS[c])
    sub = h.dropna(subset=[sel])
    fig = go.Figure(go.Bar(x=sub["product"], y=sub[sel],
                           marker=dict(color=SERIES[1], line=dict(color=SURFACE, width=2)),
                           text=[f"{v:g}%" for v in sub[sel]], textposition="outside",
                           hovertemplate="<b>%{x}</b>: %{y}%<extra></extra>"))
    fig.update_yaxes(ticksuffix="%", rangemode="tozero")
    plot(style_fig(fig, height=300, legend=False))
    st.caption("Products without a published rate for the selected AE are omitted rather than shown as zero.")

    st.markdown("#### Positioning matrix")
    st.dataframe(pd.DataFrame(I.POSITIONING), use_container_width=True, hide_index=True)
    html(f'<p class="source-note">Sources: {src_links(I.HEAD2HEAD_SOURCES)}</p>')


# ═════════════════════════════════════════════
# VIEW: DEALS & LICENSING
# ═════════════════════════════════════════════
elif view == "🤝 Deals & Licensing":
    html('<p class="page-header">Deals & Licensing</p>')
    st.markdown("## Who has rights where")
    deals = pd.DataFrame(I.DEALS)

    st.markdown("#### Territory rights matrix")
    st.caption("Rights holder per product and territory (✓ approved there · ⏳ filed · ✎ licensed, not yet filed)")
    st.dataframe(pd.DataFrame(I.RIGHTS_MATRIX), use_container_width=True, hide_index=True)

    priced = deals.dropna(subset=["value_usd_m"]).sort_values("value_usd_m")
    if not priced.empty:
        st.markdown("#### Disclosed deal values")
        st.caption("Total disclosed value (upfront + milestones) in USD millions; KRW converted at ~₩1,400/$")
        fig = go.Figure(go.Bar(y=priced["label"], x=priced["value_usd_m"], orientation="h",
                               marker=dict(color=SERIES[0], line=dict(color=SURFACE, width=2)),
                               text=[f"${v:,.0f}M" for v in priced["value_usd_m"]], textposition="outside",
                               customdata=priced[["value_text", "date"]].values,
                               hovertemplate="<b>%{y}</b><br>%{customdata[0]} (%{customdata[1]})<extra></extra>"))
        plot(style_fig(fig, height=80 + 40 * len(priced), legend=False))

    st.markdown("#### Deal log")
    html('<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Date</th><th>Asset</th><th>Licensor → Licensee</th>'
         '<th>Territory</th><th>Terms</th><th>Source</th></tr></thead><tbody>' +
         "".join(f'<tr><td>{d["date"]}</td><td><b>{d["asset"]}</b></td><td>{d["licensor"]} → <b>{d["licensee"]}</b></td>'
                 f'<td>{d["territory"]}</td><td>{d["value_text"]}</td><td style="font-size:11px">{src_links(d.get("sources"), 2)}</td></tr>'
                 for d in sorted(I.DEALS, key=lambda d: d["date"], reverse=True)) +
         '</tbody></table></div>')


# ═════════════════════════════════════════════
# VIEW: IP & EXCLUSIVITY
# ═════════════════════════════════════════════
elif view == "📜 IP & Exclusivity":
    html('<p class="page-header">IP & Exclusivity</p>')
    st.markdown("## Patent & exclusivity runway")
    st.warning("Expiry years are from public patent records and company disclosures; they exclude PTE/SPC and "
               "Korean national-phase specifics unless stated. Freedom-to-operate requires counsel review.", icon="⚠️")

    ip = pd.DataFrame(I.IP_TIMELINE).sort_values("expiry")
    st.markdown("#### Protection runway by asset")
    fig = go.Figure()
    start = date.today().year
    for i, (_, r) in enumerate(ip.iterrows()):
        near = r["expiry"] <= start + 4
        fig.add_trace(go.Bar(
            y=[f'{r["asset"]} · {r["patent"]}'], x=[r["expiry"] - start], base=[start], orientation="h",
            marker=dict(color=STATUS["serious"] if near else SERIES[0], line=dict(color=SURFACE, width=2)),
            showlegend=False, text=[str(r["expiry"])], textposition="outside",
            hovertemplate=f'<b>{r["asset"]}</b><br>{r["patent"]} · {r["holder"]}<br>{r["scope"]}<br>Expiry: {r["expiry"]}<extra></extra>'))
    fig.update_yaxes(autorange="reversed")
    fig.update_xaxes(range=[start, ip["expiry"].max() + 3], dtick=2, title_text="Year")
    plot(style_fig(fig, height=80 + 34 * len(ip), legend=False))
    st.caption("Orange = expires within 4 years (potential FTO window); blue = longer runway.")

    st.markdown("#### Pilocarpine + brimonidine combination patents (from your June 2026 research)")
    rows = ""
    for p in PATENTS:
        m = re.search(r"until (\d{4})", p["status"])
        near = (int(m.group(1)) if m else 2099) <= 2030
        note = f'<div style="margin-top:4px;font-size:11px;color:#52514e;font-style:italic">{p["note"]}</div>' if p["note"] else ""
        rows += (f'<tr><td><a href="{p["ref"]}" target="_blank"><b>{p["no"]}</b> ↗</a></td><td>{p["holder"]}</td>'
                 f'<td class="{"warn" if near else "hl"}">{p["status"]}</td><td>{p["scope"]}{note}</td></tr>')
    html(f'<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Patent</th><th>Holder</th><th>Status</th><th>Scope & notes</th></tr></thead><tbody>{rows}</tbody></table></div>')
    if I.IP_NOTES:
        st.markdown("#### IP intelligence notes")
        for n in I.IP_NOTES:
            html(info_card(n["title"], n["body"]))


# ═════════════════════════════════════════════
# VIEW: MARKET
# ═════════════════════════════════════════════
elif view == "📈 Market":
    html('<p class="page-header">Market · Global & Korea</p>')
    st.markdown("## Market size, uptake and commercial traction")
    t1, t2, t3 = st.tabs(["🌍 Global", "💵 Commercial traction", "🇰🇷 Korea"])

    with t1:
        cols = st.columns(4)
        for c, (lab, num, sub) in zip(cols, [
            ("Global presbyopes", "1.8B", "→ 2.1B by 2030 · WHO / Fricke 2018"),
            ("Total treatment market 2024", "$10.2B", "CAGR 5.5% → $16.8B (2033) · Straits"),
            ("Eye-drop segment 2024", "$1.31B", "CAGR 9.2% → $2.86B (2033) · Dataintelo"),
            ("APAC drop CAGR", f'{MARKET_GLOBAL["apac_cagr"]}%', "Fastest-growing region"),
        ]):
            c.markdown(kpi(lab, num, sub), unsafe_allow_html=True)
        st.markdown("")
        c1, c2 = st.columns(2)
        with c1:
            st.markdown("#### Eye-drop segment forecast (USD B)")
            yrs, vals = ["2024", "2026", "2028", "2033"], [1.31, 1.56, 1.86, 2.86]
            fig = go.Figure(go.Bar(x=yrs, y=vals, marker=dict(color=SERIES[0], line=dict(color=SURFACE, width=2)),
                                   text=[f"${v}B" for v in vals], textposition="outside",
                                   hovertemplate="%{x}: $%{y}B<extra></extra>"))
            fig.update_yaxes(rangemode="tozero", tickprefix="$", ticksuffix="B")
            plot(style_fig(fig, height=300, legend=False))
            st.caption("2024 & 2033 Dataintelo; 2026/2028 interpolated in your June build.")
        with c2:
            st.markdown("#### Regional share of drop market (2024)")
            reg = [("North America", 42), ("Europe", 29), ("Asia Pacific", 20), ("Rest of World", 9)]
            fig = go.Figure(go.Bar(y=[r[0] for r in reg], x=[r[1] for r in reg], orientation="h",
                                   marker=dict(color=SERIES[0], line=dict(color=SURFACE, width=2)),
                                   text=[f"{r[1]}%" for r in reg], textposition="outside",
                                   hovertemplate="%{y}: %{x}%<extra></extra>"))
            fig.update_yaxes(autorange="reversed")
            fig.update_xaxes(ticksuffix="%", range=[0, 55])
            plot(style_fig(fig, height=300, legend=False))
        for n in I.MARKET_NOTES:
            html(info_card(n["title"], n["body"]))

    with t2:
        st.markdown("#### Reported net product revenue")
        rev = pd.DataFrame(I.REVENUE)
        if not rev.empty:
            fig = go.Figure()
            for i, prod in enumerate(rev["product"].unique()):
                sub = rev[rev["product"] == prod]
                fig.add_trace(go.Bar(x=sub["period"], y=sub["usd_m"], name=prod,
                                     marker=dict(color=PRODUCT_COLOR.get(sub["key"].iloc[0], SERIES[i]),
                                                 line=dict(color=SURFACE, width=2)),
                                     text=[f"${v:g}M" for v in sub["usd_m"]], textposition="outside",
                                     hovertemplate=f"<b>{prod}</b> %{{x}}: $%{{y}}M<extra></extra>"))
            fig.update_layout(barmode="group")
            fig.update_yaxes(tickprefix="$", ticksuffix="M", rangemode="tozero")
            plot(style_fig(fig, height=360))
            st.dataframe(rev.drop(columns=["key"]), use_container_width=True, hide_index=True)
        for n in I.TRACTION_NOTES:
            html(info_card(n["title"], n["body"]))

    with t3:
        cols = st.columns(4)
        for c, (lab, num, sub) in zip(cols, [
            ("Est. presbyopes (Korea)", MARKET_KOREA["est_patients_derived"], "Derived: pop ≥40 × ~55% prevalence"),
            ("Myopia+presbyopia mkt 2025", "$632M", "Expert Market Research"),
            ("2030 forecast", "$886M", "Grand View · CAGR 11.6%"),
            ("MFDS-approved presbyopia drops", I.KOREA_APPROVED_COUNT, f"as of {I.AS_OF_LABEL}"),
        ]):
            c.markdown(kpi(lab, num, sub), unsafe_allow_html=True)
        st.markdown("")
        yrs, vals = ["2023", "2025", "2030", "2035"], [411.7, 631.6, 885.9, 1242.5]
        fig = go.Figure(go.Bar(x=yrs, y=vals, marker=dict(color=SERIES[0], line=dict(color=SURFACE, width=2)),
                               text=[f"${v:,.0f}M" for v in vals], textposition="outside",
                               hovertemplate="%{x}: $%{y:,.1f}M<extra></extra>"))
        fig.update_yaxes(rangemode="tozero", tickprefix="$", ticksuffix="M")
        plot(style_fig(fig, height=300, legend=False))
        st.caption("Combined myopia + presbyopia treatment market (incl. lenses/surgery). "
                   "Presbyopia-drop sub-segment has no published sizing.")
        st.markdown("#### Demand drivers")
        for d_item in MARKET_KOREA["drivers"]:
            st.markdown(f"- {d_item}")
        for n in I.KOREA_MARKET_NOTES:
            html(info_card(n["title"], n["body"]))


# ═════════════════════════════════════════════
# VIEW: PRODUCT DEEP-DIVE  (carried over from the original dashboard)
# ═════════════════════════════════════════════
elif view == "💊 Product Deep-Dive":
    d = DRUGS[selected_drug]
    color = PRODUCT_COLOR[selected_drug]
    upd = I.PRODUCT_UPDATES.get(selected_drug, {})
    html(f'<p class="page-header">Product Deep-Dive · {d["brand"]}</p>')
    html(f'<h2 style="color:{color};margin:0">{d["brand"]}</h2><p style="color:#52514e;margin:2px 0 10px">{d["generic"]}</p>')
    html(badge(upd.get("status_badge", d["approval_status"]), "b-ok") + badge(d["rx_type"], "b-info") +
         badge(d["company"], "b-mute"))
    html(f'<div style="font-size:13px;color:#52514e;margin:8px 0 4px">NDA <b>{d["nda_number"]}</b> · {d["application_type"]} · '
         f'Approved {d["approval_date"]}</div><div style="font-size:12px;color:#898781;font-style:italic">{d["approval_note"]}</div>')
    if upd.get("notes"):
        st.info("**Oct 2026 update:** " + " ".join(upd["notes"]), icon="🆕")

    t1, t2, t3, t4, t5 = st.tabs(["🧬 API & Chemistry", "⚗️ Formulation", "💊 Dosing & Regulatory", "🔬 Efficacy & Trials", "⚠️ Safety"])
    with t1:
        c1, c2 = st.columns([1.2, 0.8])
        c1.markdown(info_card("IUPAC name", f"<code style='font-size:12px'>{d['iupac'].replace(chr(10),'<br>')}</code>"), unsafe_allow_html=True)
        c1.markdown(info_card("Molecular formula", f"<b>{d['molecular_formula']}</b>"), unsafe_allow_html=True)
        c1.markdown(info_card("Molecular weight", f"<b>{d['molecular_weight']}</b>"), unsafe_allow_html=True)
        c2.markdown(info_card("Drug class", d["drug_class"]), unsafe_allow_html=True)
        c2.markdown(info_card("Active concentration", f"<b>{d['concentration']}</b><br><span style='color:#52514e;font-size:12px'>{d['free_base_equivalent']}</span>"), unsafe_allow_html=True)
        st.markdown(info_card("Mechanism of action", f"<div style='white-space:pre-line'>{d['moa']}</div>"), unsafe_allow_html=True)
        st.markdown(info_card("Technology / platform", d["technology"]), unsafe_allow_html=True)
    with t2:
        c1, c2, c3 = st.columns(3)
        c1.markdown(info_card("Dosage form", d["dosage_form"]), unsafe_allow_html=True)
        c1.markdown(info_card("Preservative", f"<span class='{'hl' if 'None' in d['preservative'] else 'warn'}'>{d['preservative']}</span>"), unsafe_allow_html=True)
        c2.markdown(info_card("pH range", f"<b>{d['ph_range']}</b>"), unsafe_allow_html=True)
        c2.markdown(info_card("Storage", d["storage"]), unsafe_allow_html=True)
        c3.markdown(info_card("Concentration", f"<b>{d['concentration']}</b>"), unsafe_allow_html=True)
        st.markdown("#### Excipients — formulation rationale")
        rows = "".join(f'<tr><td><b>{e["name"]}</b></td><td>{badge(e["role"], "b-info")}</td><td>{e["function"]}</td></tr>' for e in d["excipients"])
        html(f'<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Excipient</th><th>Role</th><th>Function & rationale</th></tr></thead><tbody>{rows}</tbody></table></div>')
    with t3:
        c1, c2 = st.columns(2)
        c1.markdown(info_card("Dosing", d["dosing"]), unsafe_allow_html=True)
        c1.markdown(info_card("Onset / duration", f"<span class='hl'>{d['onset']}</span> · <span class='hl'>{d['duration']}</span>"), unsafe_allow_html=True)
        c2.markdown(info_card("Regulatory filing", f"<b>NDA:</b> {d['nda_number']}<br><b>Type:</b> {d['application_type']}<br><b>Approval:</b> {d['approval_date']}"), unsafe_allow_html=True)
        c2.markdown(info_card("Status", f"{upd.get('status_badge', d['approval_status'])}"), unsafe_allow_html=True)
    with t4:
        st.markdown(info_card("Overall efficacy", d["efficacy_summary"]), unsafe_allow_html=True)
        for t in d["key_trials"]:
            html(trial_box(t))
    with t5:
        ae = pd.DataFrame(d["side_effects"], columns=["Adverse effect", "Incidence", "Notes"])
        st.dataframe(ae, use_container_width=True, hide_index=True)
        st.markdown(info_card("Contraindications & warnings", f"<span class='danger'>{d['contraindications']}</span>"), unsafe_allow_html=True)


# ═════════════════════════════════════════════
# VIEW: PK/PD  (carried over)
# ═════════════════════════════════════════════
elif view == "🔬 PK/PD Evidence":
    html('<p class="page-header">Selected nonclinical & clinical PK/PD studies</p>')
    st.markdown("## PK/PD evidence base")
    drugs = sorted({s["drug"] for s in PKPD_STUDIES})
    f = st.multiselect("Filter by drug", drugs, default=drugs)
    kind = st.radio("Study type", ["All", "Nonclinical only", "Clinical only"], horizontal=True)
    rows = [s for s in PKPD_STUDIES if s["drug"] in f]
    is_clin = lambda s: "human" in s["model"].lower()
    if kind == "Nonclinical only":
        rows = [s for s in rows if not is_clin(s)]
    elif kind == "Clinical only":
        rows = [s for s in rows if is_clin(s)]
    st.caption(f"{len(rows)} studies shown")
    html('<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Drug</th><th>Study</th><th>Model</th>'
         '<th>Endpoint</th><th>Key result</th><th>Ref</th></tr></thead><tbody>' +
         "".join(f'<tr><td><b>{s["drug"]}</b></td><td>{badge("CLINICAL","b-ok") if is_clin(s) else badge("NONCLINICAL","b-info")}<br>{s["study"]}</td>'
                 f'<td>{s["model"]}</td><td>{s["endpoint"]}</td><td>{s["result"]}</td>'
                 f'<td style="font-size:11px"><a href="{s["ref"]}" target="_blank">{s["ref_short"]} ↗</a></td></tr>' for s in rows) +
         '</tbody></table></div>')


# ═════════════════════════════════════════════
# VIEW: SOURCES & METHOD
# ═════════════════════════════════════════════
elif view == "📚 Sources & Method":
    html('<p class="page-header">Sources & Method</p>')
    st.markdown("## How this intelligence was built")
    st.markdown(I.METHOD_MD)
    st.markdown("#### Open questions / items to verify")
    for q in I.OPEN_QUESTIONS:
        st.markdown(f"- {q}")
    st.markdown("#### Full event log")
    ev = pd.DataFrame(sorted(I.EVENTS, key=lambda e: e["date"], reverse=True))
    st.dataframe(ev[["date", "region", "type", "company", "text"]], use_container_width=True, hide_index=True)
    st.markdown("#### Source index")
    seen = {}
    for c in I.COMPETITORS + I.KOREA_COMPANIES + I.DEALS + I.EVENTS:
        for s in c.get("sources", []) or []:
            url = s[1] if isinstance(s, (list, tuple)) else s
            seen.setdefault(url, s)
    html("<br>".join(src_links([v]) for v in seen.values()))

# ─────────────────────────────────────────────
# FOOTER
# ─────────────────────────────────────────────
st.markdown("---")
html(f'<p class="source-note">Presbyopia Eye-Drop Competitor Intelligence · Built on the June 2026 Presbyopia Dashboard '
     f'(product, PK/PD, patent and market data) and refreshed with web research to {I.AS_OF_LABEL}. Every competitor record '
     f'carries its sources and a confidence tag. For internal research use only — not legal or investment advice.</p>')
