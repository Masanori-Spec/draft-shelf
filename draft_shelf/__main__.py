"""Read an unpacked project; create a new ZIP without modifying the source."""
import argparse
import os
from pathlib import Path
import stat
import sys
import zipfile

from .core import InvalidProject, MAX_DOCUMENT, MAX_ITEMS, MAX_TOTAL, MAX_XML, export_project


def bounded(path: Path, cap: int) -> bytes:
    # A FIFO can block in open() before fstat. Nonblocking mode lets us reject
    # non-regular input safely, including a race between listing and opening.
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as stream:
        if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
            raise InvalidProject("Input is not a regular file")
        data = stream.read(cap + 1)
    if len(data) > cap:
        raise InvalidProject("Input file exceeds its byte limit")
    return data


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("project", type=Path)
    ap.add_argument("output", type=Path)
    args = ap.parse_args(argv)
    try:
        source = args.project.resolve(strict=True)
        target = args.output.absolute()
        if source in target.resolve().parents or source == target.resolve():
            raise InvalidProject("Output must be outside the source project")
        content = source / "content"
        if not source.is_dir() or not content.is_dir() or content.is_symlink():
            raise InvalidProject("Choose an unpacked project folder with a real content directory")
        files = {"nwProject.nwx": bounded(source / "nwProject.nwx", MAX_XML)}
        total = len(files["nwProject.nwx"])
        for path in content.iterdir():
            if len(files) > MAX_ITEMS:
                raise InvalidProject("Too many documents")
            data = bounded(path, MAX_DOCUMENT)
            total += len(data)
            if total > MAX_TOTAL:
                raise InvalidProject("Input exceeds 32 MiB")
            files["content/" + path.name] = data
        result = export_project(files)
        # Exclusive creation refuses existing outputs, including symlinks.
        with target.open("xb") as output:
            with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_STORED) as archive:
                for name in result.directories:
                    archive.writestr(zipfile.ZipInfo(name, (2026, 10, 6, 0, 0, 0)), b"")
                for name, data in result.files.items():
                    archive.writestr(zipfile.ZipInfo(name, (2026, 10, 6, 0, 0, 0)), data)
        print(f"Exported {len(result.files)-1} source documents; source project unchanged")
        return 0
    except (InvalidProject, OSError, ValueError) as exc:
        print(f"DraftShelf: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
