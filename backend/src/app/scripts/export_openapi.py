import json
import sys
from pathlib import Path

from app.main import app

USAGE_ERROR = "usage: python -m app.scripts.export_openapi <target>"


def export_openapi(target: Path) -> None:
    target.write_text(
        f"{json.dumps(app.openapi(), indent=2, ensure_ascii=False)}\n",
        encoding="utf-8",
    )


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(USAGE_ERROR)
    export_openapi(Path(sys.argv[1]))


if __name__ == "__main__":
    main()
