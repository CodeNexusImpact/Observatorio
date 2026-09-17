"""Leitor de .xlsx usando apenas a biblioteca padrão (zipfile + xml)."""
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import date, timedelta

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def col_to_num(col):
    n = 0
    for ch in col:
        n = n * 26 + ord(ch) - 64
    return n


def load_workbook(path):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rmap = {r.get("Id"): r.get("Target") for r in rels}
    sheets = {}
    for s in wb.find("m:sheets", NS):
        rid = s.get("{%s}id" % NS["r"])
        tgt = rmap[rid]
        tgt = tgt[1:] if tgt.startswith("/") else "xl/" + tgt
        root = ET.fromstring(z.read(tgt))
        rows = []
        for row in root.iter("{%s}row" % NS["m"]):
            cells = {}
            for c in row.findall("m:c", NS):
                ref = c.get("r")
                col = re.match(r"[A-Z]+", ref).group()
                t = c.get("t")
                v = c.find("m:v", NS)
                if t == "s" and v is not None:
                    val = shared[int(v.text)]
                elif t == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
                elif v is not None:
                    val = v.text
                else:
                    val = None
                if val is not None and str(val).strip() != "":
                    cells[col] = val
            rows.append((int(row.get("r")), cells))
        sheets[s.get("name")] = rows
    return sheets


def sheet_to_records(rows, header_row_index=0):
    """Converte linhas {col: valor} em dicts usando a primeira linha não vazia como cabeçalho."""
    nonempty = [r for r in rows if r[1]]
    if not nonempty:
        return [], []
    hdr_num, hdr = nonempty[header_row_index]
    headers = {col: str(name).strip() for col, name in hdr.items()}
    recs = []
    for rn, cells in nonempty[header_row_index + 1:]:
        rec = {"_row": rn}
        for col, val in cells.items():
            key = headers.get(col, "_col_" + col)
            rec[key] = val
        recs.append(rec)
    return list(headers.values()), recs


def excel_serial_to_date(serial):
    try:
        n = float(serial)
    except (TypeError, ValueError):
        return None
    if n < 20000 or n > 60000:
        return None
    return date(1899, 12, 30) + timedelta(days=int(n))
