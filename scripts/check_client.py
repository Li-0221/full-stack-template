"""重新生成前端契约与 SDK, 检查是否与工作区一致。"""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGE = ROOT / "frontend"


def snapshot(app: Path) -> dict[str, bytes]:
    paths = [app / "openapi.json", *(app / "src" / "client").rglob("*")]
    return {str(path.relative_to(app)): path.read_bytes() for path in paths if path.is_file()}


def main() -> int:
    previous = snapshot(PACKAGE)
    result = subprocess.run(["make", "generate-client"], cwd=ROOT, check=False)
    if result.returncode:
        return result.returncode
    current = snapshot(PACKAGE)
    changed = sorted(
        name for name in previous.keys() | current.keys() if previous.get(name) != current.get(name)
    )
    if changed:
        print("前端生成产物已更新, 请检查并保存以下差异:")
        print("\n".join(changed))
        return 1
    print("前端 OpenAPI 与 SDK 一致。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
