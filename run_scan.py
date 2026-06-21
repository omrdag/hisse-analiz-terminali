"""Komut satırından (cron / Railway scheduled job / GitHub Actions) tarama çalıştırmak için.

Kullanım:
    python scripts/run_scan.py

Streamlit arayüzünden bağımsız çalışır; sonuçları aynı CSV dosyalarına yazar,
böylece panel bir sonraki açılışta güncel veriyi gösterir.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core import scanner, watchlist_store  # noqa: E402


def main() -> None:
    tickers = watchlist_store.load_watchlist()
    print(f"{len(tickers)} hisse taranıyor: {', '.join(tickers)}")
    result = scanner.run_scan(tickers)
    print(
        f"Tamamlandı → fırsat: {len(result['opportunities'])}, "
        f"bekleme: {len(result['watchlist'])}, "
        f"kriterleri bozulan: {len(result['removed'])}, "
        f"hata: {len(result['failed'])}"
    )
    for f in result["failed"]:
        print(f"  ! {f['ticker']}: {f['error']}")


if __name__ == "__main__":
    main()
