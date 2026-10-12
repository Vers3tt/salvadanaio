"""Genera i Comandi Rapidi di Salvadanaio (Uscita, Entrata, Saldo) e li firma con `shortcuts sign`.
Uso: python3 design/build_shortcuts.py                      -> comandi/*.shortcut (chiedono il codice all'import)
     SD_TOKEN=sd_... SD_OUT=/cartella python3 design/...     -> comandi personali con il codice già dentro"""
import plistlib, uuid, subprocess, os, re, tempfile
TOKEN = os.environ.get("SD_TOKEN", "")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = open(os.path.join(ROOT, "config.js")).read()
URL = re.search(r'supabaseUrl:\s*"([^"]+)"', cfg).group(1)
KEY = re.search(r'supabaseAnonKey:\s*"([^"]+)"', cfg).group(1)
CATS_OUT = ["Spesa", "Casa", "Bollette", "Trasporti", "Svago", "Ristoranti", "Shopping", "Salute", "Altro"]
CATS_IN = ["Stipendio", "Paghetta", "Regalo", "Vendita", "Lavoretto", "Altro"]

def U(): return str(uuid.uuid4()).upper()
def text(s): return {"Value": {"string": s, "attachmentsByRange": {}}, "WFSerializationType": "WFTextTokenString"}
def var_text(out_uuid, name):  # a text field made of a single action output
    return {"Value": {"string": "￼", "attachmentsByRange": {"{0, 1}": {"OutputUUID": out_uuid, "Type": "ActionOutput", "OutputName": name}}},
            "WFSerializationType": "WFTextTokenString"}
def var_attach(out_uuid, name):
    return {"Value": {"OutputUUID": out_uuid, "Type": "ActionOutput", "OutputName": name}, "WFSerializationType": "WFTextTokenAttachment"}
def dict_items(pairs):  # [(key, value-field)] -> WFDictionaryFieldValue
    return {"Value": {"WFDictionaryFieldValueItems": [{"WFItemType": 0, "WFKey": text(k), "WFValue": v} for k, v in pairs]},
            "WFSerializationType": "WFDictionaryFieldValue"}
def act(ident, params): return {"WFWorkflowActionIdentifier": ident, "WFWorkflowActionParameters": params}

def token_action(tid):
    return act("is.workflow.actions.gettext", {"UUID": tid, "WFTextActionText": text(TOKEN) if TOKEN else ""})

def request(rid, fn, body):
    return act("is.workflow.actions.downloadurl", {
        "UUID": rid, "WFURL": f"{URL}/rest/v1/rpc/{fn}", "WFHTTPMethod": "POST", "WFHTTPBodyType": "JSON",
        "WFJSONValues": dict_items(body), "ShowHeaders": True,
        "WFHTTPHeaders": dict_items([("apikey", text(KEY)), ("Content-Type", text("application/json"))])})

def show_message(rid):
    vid = U()
    return [act("is.workflow.actions.getvalueforkey", {"UUID": vid, "WFInput": var_attach(rid, "Contents of URL"), "WFDictionaryKey": "messaggio"}),
            act("is.workflow.actions.showresult", {"Text": var_text(vid, "Dictionary Value")})]

def movement(kind):
    tid, nid, lid, cid, rid = U(), U(), U(), U(), U()
    cats = CATS_OUT if kind == "out" else CATS_IN
    actions = [
        token_action(tid),
        act("is.workflow.actions.ask", {"UUID": nid, "WFInputType": "Number",
            "WFAskActionPrompt": "Quanto hai speso?" if kind == "out" else "Quanto è entrato?"}),
        act("is.workflow.actions.list", {"UUID": lid, "WFItems": cats}),
        act("is.workflow.actions.choosefromlist", {"UUID": cid, "WFInput": var_attach(lid, "List"),
            "WFChooseFromListActionPrompt": "Categoria"}),
        request(rid, "quick_add", [("p_token", var_text(tid, "Text")), ("p_type", text(kind)),
                                   ("p_amount", var_text(nid, "Provided Input")), ("p_cat", var_text(cid, "Chosen Item"))]),
        *show_message(rid)]
    return actions

def balance():
    tid, rid = U(), U()
    return [token_action(tid), request(rid, "quick_balance", [("p_token", var_text(tid, "Text"))]), *show_message(rid)]

def workflow(actions, glyph, color):
    return {
        "WFWorkflowClientVersion": "2605.0.5", "WFWorkflowMinimumClientVersion": 900, "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowIcon": {"WFWorkflowIconStartColor": color, "WFWorkflowIconGlyphNumber": glyph},
        "WFWorkflowImportQuestions": [] if TOKEN else [{"ActionIndex": 0, "Category": "Parameter", "DefaultValue": "", "ParameterKey": "WFTextActionText",
            "Text": "Incolla il tuo codice personale: lo trovi nell'app Salvadanaio in Altro → Siri e widget."}],
        "WFWorkflowTypes": ["NCWidget", "WatchKit"], "WFWorkflowInputContentItemClasses": [],
        "WFWorkflowHasShortcutInputVariables": False, "WFWorkflowHasOutputFallback": False,
        "WFQuickActionSurfaces": [], "WFWorkflowOutputContentItemClasses": [],
        "WFWorkflowActions": actions}

# colori del Comando Rapido: blu scuro, verde, blu
SPECS = [("Uscita Salvadanaio", movement("out"), 59511, 463140863),
         ("Entrata Salvadanaio", movement("in"), 59511, 431817727),
         ("Saldo Salvadanaio", balance(), 59446, 4282601983)]
out = os.environ.get("SD_OUT") or os.path.join(ROOT, "comandi"); os.makedirs(out, exist_ok=True)
for name, actions, glyph, color in SPECS:
    with tempfile.NamedTemporaryFile(suffix=".shortcut", delete=False) as f:
        plistlib.dump(workflow(actions, glyph, color), f, fmt=plistlib.FMT_BINARY); raw = f.name
    dest = os.path.join(out, name + ".shortcut")
    r = subprocess.run(["shortcuts", "sign", "--mode", "anyone", "--input", raw, "--output", dest], capture_output=True, text=True)
    print(name, "->", "ok" if r.returncode == 0 and os.path.exists(dest) else ("ERRORE " + r.stderr.strip()))
    os.unlink(raw)
