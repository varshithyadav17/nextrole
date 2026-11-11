"""Read XLSX source cells without changing them and prepare resumable admin imports.

Python standard library only. Output contains private source data: keep it out of Git.
Usage: python scripts/prepare-analytics-import.py --out /tmp/nextrole-import file.xlsx ...
"""
import argparse
import base64
import gzip
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def encoded(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()


def sha(value):
    return hashlib.sha256(value).hexdigest()


def read_workbook(path):
    data = path.read_bytes()
    source = sha(data)
    records, sheets = [], []
    synthetic = False
    with ZipFile(path) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            for item in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", NS):
                strings.append("".join(item.itertext()))
        relationships = {
            item.attrib["Id"]: item.attrib["Target"]
            for item in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        }
        for sheet in ET.fromstring(archive.read("xl/workbook.xml")).findall("m:sheets/m:sheet", NS):
            name = sheet.attrib["name"]
            target = relationships[sheet.attrib["{" + REL + "}id"]]
            target = target.lstrip("/") if target.startswith("/") else "xl/" + target
            sheet_rows, header_row, columns = [], None, {}
            for row in ET.fromstring(archive.read(target)).findall("m:sheetData/m:row", NS):
                cells, formulas = {}, {}
                for cell in row.findall("m:c", NS):
                    column = re.sub(r"\d", "", cell.attrib["r"])
                    kind = cell.attrib.get("t", "n")
                    element = cell.find("m:v", NS)
                    value = element.text if element is not None else None
                    if kind == "s" and value is not None:
                        value = strings[int(value)]
                    elif kind == "inlineStr":
                        value = "".join(cell.find("m:is", NS).itertext())
                    elif kind == "b" and value is not None:
                        value = value == "1"
                    elif kind == "n" and value is not None:
                        number = float(value)
                        value = int(number) if number.is_integer() else number
                    if value is not None:
                        cells[column] = value
                        if isinstance(value, str) and (
                            value.strip() == "SYNTHETIC"
                            or "SYNTHETIC DEMO" in value
                            or "All identities, credentials" in value
                        ):
                            synthetic = True
                    formula = cell.find("m:f", NS)
                    if formula is not None:
                        formulas[column] = formula.text or ""
                if not cells and not formulas:
                    continue
                number = int(row.attrib["r"])
                markers = {str(value).strip().lower() for value in cells.values()}
                if header_row is None and markers.intersection(
                    {"user id", "user_id", "visitor_id", "activity_id", "feedback_id", "cohort_week", "setting", "metric"}
                ):
                    header_row, columns = number, {key: str(value) for key, value in cells.items()}
                item = {"source": source, "sheet": name, "row": number, "cells": cells}
                if formulas:
                    item["formulas"] = formulas
                sheet_rows.append(item)
            sheets.append({"name": name, "rows": len(sheet_rows), "headerRow": header_row, "columns": columns})
            records.extend(sheet_rows)
    blob = base64.b64encode(data).decode()
    parts = [blob[index:index + 12000] for index in range(0, len(blob), 12000)]
    metadata = {"sha256": source, "fileName": path.name, "bytes": len(data), "parts": len(parts), "origin": "synthetic" if synthetic else "imported", "sheets": sheets}
    return metadata, records, parts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True)
    parser.add_argument("files", nargs="+")
    args = parser.parse_args()
    output = Path(args.out).resolve()
    output.mkdir(parents=True, exist_ok=True)
    sources, records, file_parts = [], [], []
    for filename in args.files:
        source, rows, parts = read_workbook(Path(filename))
        sources.append(source)
        records.extend(rows)
        file_parts.extend({"source": source["sha256"], "part": index, "data": value} for index, value in enumerate(parts))
    if len({source["sha256"] for source in sources}) != len(sources):
        raise ValueError("The same workbook was selected twice.")
    import_id = sha("\n".join(sorted(source["sha256"] for source in sources)).encode())
    pages, packets = [], []
    for index in range(0, len(records), 50):
        group = records[index:index + 50]
        raw = encoded(group)
        page = len(pages)
        pages.append({"index": page, "sha256": sha(raw), "rows": len(group)})
        packets.append({"id": import_id, "page": page, "packed": base64.b64encode(gzip.compress(raw, mtime=0)).decode()})
    manifest = {"version": 1, "title": "NextRole workbook import", "sources": sources, "pages": pages, "totalRows": len(records)}
    (output / "manifest.json").write_bytes(encoded(manifest))
    (output / "pages.json").write_bytes(encoded(packets))
    (output / "files.json").write_bytes(encoded([dict(id=import_id, **part) for part in file_parts]))
    (output / "source-rows.json").write_bytes(encoded(records))
    print(json.dumps({"id": import_id, "sources": len(sources), "sourceRows": len(records), "pages": len(pages), "fileParts": len(file_parts), "output": str(output)}))


if __name__ == "__main__":
    main()
