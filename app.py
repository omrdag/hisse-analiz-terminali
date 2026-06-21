"""Fırsat Radarı - ABD Hisse Analiz Paneli ana sayfası.

Sade, karar odaklı tasarım: sadece fırsat listesindeki hisseler ve gerekli
alım/satım bilgileri gösterilir. Detaylı göstergeler (RSI, EMA/SMA, haberler vb.)
'Hisse Detayı' sayfasında yer alır.
"""
from __future__ import annotations

import pandas as pd
import streamlit as st

from core import persistence, scanner, watchlist_store

st.set_page_config(page_title="Fırsat Radarı", page_icon="📡", layout="wide")

DISPLAY_COLUMNS = {
    "rank_no": "Sıra",
    "ticker": "Ticker",
    "name": "Şirket",
    "vade": "Vade",
    "total_score": "Skor",
    "decision": "Karar",
    "buy_zone_1": "1. Alım",
    "buy_zone_2": "2. Alım",
    "buy_zone_3": "3. Alım",
    "stop_loss": "Stop",
    "target_1": "Hedef 1",
    "target_2": "Hedef 2",
    "risk_reward": "R/R",
    "status": "Durum",
}


def _init_state() -> None:
    if "opportunities_df" not in st.session_state:
        st.session_state.opportunities_df = persistence.load_opportunities()


def _run_scan() -> None:
    tickers = watchlist_store.load_watchlist()
    if not tickers:
        st.warning("Watchlist boş. Önce 'Watchlist Yönetimi' sayfasından hisse ekleyin.")
        return
    with st.spinner(f"{len(tickers)} hisse taranıyor... (bu işlem biraz sürebilir)"):
        result = scanner.run_scan(tickers)
    st.session_state.opportunities_df = result["opportunities"]
    if result["failed"]:
        details = ", ".join(f"{f['ticker']} ({f['error']})" for f in result["failed"])
        st.warning(f"Bazı hisseler taranamadı: {details}")
    st.success("Tarama tamamlandı.")


def _format_table(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    cols = [c for c in DISPLAY_COLUMNS if c in df.columns]
    out = df[cols].rename(columns=DISPLAY_COLUMNS)
    if "R/R" in out.columns:
        out["R/R"] = out["R/R"].apply(lambda x: f"1:{x:.1f}" if pd.notna(x) else "-")
    if "Skor" in out.columns:
        out["Skor"] = out["Skor"].apply(lambda x: f"{x:.0f}")
    return out


def main() -> None:
    _init_state()
    df = st.session_state.opportunities_df

    st.title("📡 Fırsat Radarı")
    st.caption("Watchlist'inizdeki hisseleri tarayıp kriterleri sağlayan en iyi fırsatları sıralar.")

    total_count = len(df)
    kisa_count = int((df["vade"] == "Kısa").sum()) if not df.empty else 0
    orta_count = int((df["vade"] == "Orta").sum()) if not df.empty else 0
    uzun_count = int((df["vade"] == "Uzun").sum()) if not df.empty else 0
    avg_score = round(df["total_score"].mean(), 1) if not df.empty else 0.0
    last_scan = persistence.last_scan_time() or "Henüz tarama yapılmadı"

    m1, m2, m3, m4, m5 = st.columns(5)
    m1.metric("Kriterleri Tamamlayan", total_count)
    m2.metric("Kısa Vade Fırsat", kisa_count)
    m3.metric("Orta Vade Fırsat", orta_count)
    m4.metric("Uzun Vade Fırsat", uzun_count)
    m5.metric("Ortalama Skor", avg_score)

    c1, c2 = st.columns([3, 1])
    with c1:
        st.caption(f"Son güncelleme: {last_scan}")
    with c2:
        if st.button("🔄 Taramayı Yenile", use_container_width=True):
            _run_scan()
            st.rerun()

    st.divider()

    if df.empty:
        st.info("Henüz fırsat bulunamadı. 'Taramayı Yenile' butonuna basarak ilk taramayı başlatın.")
    else:
        tab_kisa, tab_orta, tab_uzun = st.tabs(["Kısa Vade", "Orta Vade", "Uzun Vade"])
        for tab, vade in zip((tab_kisa, tab_orta, tab_uzun), ("Kısa", "Orta", "Uzun")):
            with tab:
                sub = (
                    df[df["vade"] == vade]
                    .sort_values("rank_score", ascending=False)
                    .head(10)
                )
                if sub.empty:
                    st.info(f"{vade} vadede şu an kriterleri sağlayan fırsat yok.")
                else:
                    st.dataframe(_format_table(sub), use_container_width=True, hide_index=True)

    st.divider()
    st.caption(
        "⚠️ Bu analiz yatırım tavsiyesi değildir; karar vermeden önce kendi risk "
        "profilinizi ve portföy büyüklüğünüzü dikkate almalısınız."
    )


main()
