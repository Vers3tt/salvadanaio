"""Genera i Comandi Rapidi di Keepo (Uscita, Entrata, Saldo, Pagamento, Accredito) e li firma con `shortcuts sign`.
Uso: python3 design/build_shortcuts.py                      -> comandi/*.shortcut (chiedono il codice all'import)
     SD_TOKEN=sd_... SD_OUT=/cartella python3 design/...     -> comandi personali con il codice già dentro"""
import plistlib, uuid, subprocess, os, re, tempfile
TOKEN = os.environ.get("SD_TOKEN", "")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = open(os.path.join(ROOT, "config.js")).read()
URL = os.environ.get("SD_URL") or re.search(r'supabaseUrl:\s*"([^"]+)"', cfg).group(1)   # SD_URL: server di prova per i video
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

CODE_PATH = "Keepo/codice.txt"   # in iCloud Drive → Comandi Rapidi, condiviso da tutti i comandi
def named(name):  # text field made of a named variable
    return {"Value": {"string": "\uFFFC", "attachmentsByRange": {"{0, 1}": {"Type": "Variable", "VariableName": name}}},
            "WFSerializationType": "WFTextTokenString"}

def token_action():
    """Ritorna (azioni, campo-testo-del-codice). La prima volta chiede il codice e lo salva in iCloud;
    poi rilegge sempre il file, senza variabili intermedie."""
    if TOKEN:
        return [], text(TOKEN)
    fid, cb, ask, g, fid2 = U(), U(), U(), U(), U()
    acts = [
        act("is.workflow.actions.documentpicker.open", {"UUID": fid, "WFGetFilePath": CODE_PATH, "WFFileErrorIfNotFound": False, "WFShowFilePicker": False}),
        act("is.workflow.actions.conditional", {"GroupingIdentifier": g, "WFControlFlowMode": 0, "WFCondition": 101,
            "WFInput": {"Type": "Variable", "Variable": var_attach(fid, "File")}}),
        act("is.workflow.actions.getclipboard", {"UUID": cb}),
        act("is.workflow.actions.ask", {"UUID": ask, "WFInputType": "Text",
            "WFAskActionPrompt": "Codice personale di Keepo (app → Altro → Siri e widget → Copia codice)",
            "WFAskActionDefaultAnswer": var_text(cb, "Clipboard")}),
        act("is.workflow.actions.documentpicker.save", {"WFInput": var_attach(ask, "Provided Input"), "WFAskWhereToSave": False,
            "WFFileDestinationPath": CODE_PATH, "WFSaveFileOverwrite": True}),
        act("is.workflow.actions.conditional", {"GroupingIdentifier": g, "WFControlFlowMode": 2, "UUID": U()}),
        act("is.workflow.actions.documentpicker.open", {"UUID": fid2, "WFGetFilePath": CODE_PATH, "WFFileErrorIfNotFound": True, "WFShowFilePicker": False}),
    ]
    return acts, var_text(fid2, "File")

def forget_bad_code(msg_uuid):
    """Se il server dice che il codice non vale più, cancella quello salvato: la prossima volta lo richiede.
    Usa una ricerca di testo + "Se … ha un valore" (la condizione "contiene" non viene importata bene)."""
    if TOKEN: return []
    g, mid, fid = U(), U(), U()
    return [
        act("is.workflow.actions.text.match", {"UUID": mid, "WFMatchTextPattern": "Codice non valido", "WFMatchTextCaseSensitive": False,
            "text": var_text(msg_uuid, "Dictionary Value")}),
        act("is.workflow.actions.conditional", {"GroupingIdentifier": g, "WFControlFlowMode": 0, "WFCondition": 100,
            "WFInput": {"Type": "Variable", "Variable": var_attach(mid, "Matches")}}),
        act("is.workflow.actions.documentpicker.open", {"UUID": fid, "WFGetFilePath": CODE_PATH, "WFFileErrorIfNotFound": False, "WFShowFilePicker": False}),
        act("is.workflow.actions.file.delete", {"WFInput": var_attach(fid, "File"), "WFDeleteFileConfirmDeletion": False}),
        act("is.workflow.actions.conditional", {"GroupingIdentifier": g, "WFControlFlowMode": 2, "UUID": U()}),
    ]

def request(rid, fn, body):
    return act("is.workflow.actions.downloadurl", {
        "UUID": rid, "WFURL": f"{URL}/rest/v1/rpc/{fn}", "WFHTTPMethod": "POST", "WFHTTPBodyType": "JSON",
        "WFJSONValues": dict_items(body), "ShowHeaders": True,
        "WFHTTPHeaders": dict_items([("apikey", text(KEY)), ("Content-Type", text("application/json"))])})

def show_message(rid):
    vid = U()
    return [act("is.workflow.actions.getvalueforkey", {"UUID": vid, "WFInput": var_attach(rid, "Contents of URL"), "WFGetDictionaryValueType": "Value", "WFDictionaryKey": "messaggio"}),
            *forget_bad_code(vid),
            act("is.workflow.actions.showresult", {"Text": var_text(vid, "Dictionary Value")})]

def movement(kind):
    tid, nid, lid, cid, rid = U(), U(), U(), U(), U()
    cats = CATS_OUT if kind == "out" else CATS_IN
    code_acts, code = token_action()
    actions = [
        *code_acts,
        act("is.workflow.actions.ask", {"UUID": nid, "WFInputType": "Number",
            "WFAskActionPrompt": "Quanto hai speso?" if kind == "out" else "Quanto è entrato?"}),
        act("is.workflow.actions.list", {"UUID": lid, "WFItems": [{"WFItemType": 0, "WFValue": text(c)} for c in cats]}),
        act("is.workflow.actions.choosefromlist", {"UUID": cid, "WFInput": var_attach(lid, "List"),
            "WFChooseFromListActionPrompt": "Categoria"}),
        request(rid, "quick_add", [("p_token", code), ("p_type", text(kind)),
                                   ("p_amount", var_text(nid, "Provided Input")), ("p_cat", var_text(cid, "Chosen Item"))]),
        *show_message(rid)]
    return actions

def payment():
    """Per l'automazione Apple Pay: riceve "importo;negozio;carta" e lo manda a Keepo, poi mostra una notifica."""
    rid, vid = U(), U()
    code_acts, code = token_action()
    shortcut_input = {"Value": {"string": "\uFFFC", "attachmentsByRange": {"{0, 1}": {"Type": "ExtensionInput"}}}, "WFSerializationType": "WFTextTokenString"}
    return [*code_acts, request(rid, "quick_pay", [("p_token", code), ("p_raw", shortcut_input)]),
            act("is.workflow.actions.getvalueforkey", {"UUID": vid, "WFInput": var_attach(rid, "Contents of URL"), "WFGetDictionaryValueType": "Value", "WFDictionaryKey": "messaggio"}),
            act("is.workflow.actions.notification", {"WFNotificationActionTitle": "Keepo", "WFNotificationActionBody": var_text(vid, "Dictionary Value"), "WFNotificationActionSound": False})]

# importo vicino a una parola da accredito: "hai ricevuto un bonifico di 50,00 €", "accredito di € 1.250,00"
INCOME_RE = r"(accredit|ricevut|bonific|ricaric|rimbors|storn|stipendi|entrat|versament)[^0-9€\n]{0,60}(€\s?)?[0-9]{1,3}([.\s][0-9]{3})*(,[0-9]{1,2})?"
BANKS_RE = r"hype|revolut|n26|satispay|paypal|postepay|bancoposta|poste|intesa|isybank|unicredit|buddybank|bper|bnl|mediolanum|fineco|widiba|credem|illimity|webank|chebanca|ing|bunq|wise|tinaba|sella|mps|monte dei paschi|credit agricole|crédit agricole|banco bpm|bpm"

def income_from_email():
    """Per l'automazione "Quando ricevo un'email": legge l'email SUL TELEFONO e manda a Keepo solo
    la frase con l'importo e il nome della banca, poi mostra una notifica."""
    tid, m1, m2, rid, vid = U(), U(), U(), U(), U()
    code_acts, code = token_action()
    shortcut_input = {"Value": {"string": "\uFFFC", "attachmentsByRange": {"{0, 1}": {"Type": "ExtensionInput"}}}, "WFSerializationType": "WFTextTokenString"}
    raw = {"Value": {"string": "\uFFFC;\uFFFC", "attachmentsByRange": {
              "{0, 1}": {"OutputUUID": m1, "Type": "ActionOutput", "OutputName": "Matches"},
              "{2, 1}": {"OutputUUID": m2, "Type": "ActionOutput", "OutputName": "Matches"}}}, "WFSerializationType": "WFTextTokenString"}
    return [act("is.workflow.actions.gettext", {"UUID": tid, "WFTextActionText": shortcut_input}),
            act("is.workflow.actions.text.match", {"UUID": m1, "WFMatchTextPattern": INCOME_RE, "WFMatchTextCaseSensitive": False, "text": var_text(tid, "Text")}),
            act("is.workflow.actions.text.match", {"UUID": m2, "WFMatchTextPattern": BANKS_RE, "WFMatchTextCaseSensitive": False, "text": var_text(tid, "Text")}),
            *code_acts, request(rid, "quick_income", [("p_token", code), ("p_raw", raw)]),
            act("is.workflow.actions.getvalueforkey", {"UUID": vid, "WFInput": var_attach(rid, "Contents of URL"), "WFGetDictionaryValueType": "Value", "WFDictionaryKey": "messaggio"}),
            act("is.workflow.actions.notification", {"WFNotificationActionTitle": "Keepo", "WFNotificationActionBody": var_text(vid, "Dictionary Value"), "WFNotificationActionSound": False})]

def balance():
    tid, rid = U(), U()
    code_acts, code = token_action()
    return [*code_acts, request(rid, "quick_balance", [("p_token", code)]), *show_message(rid)]

def workflow(actions, glyph, color, takes_input=False):
    return {
        "WFWorkflowClientVersion": "2605.0.5", "WFWorkflowMinimumClientVersion": 900, "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowIcon": {"WFWorkflowIconStartColor": color, "WFWorkflowIconGlyphNumber": glyph},
        "WFWorkflowImportQuestions": [],
        "WFWorkflowTypes": ["NCWidget", "WatchKit"] if not takes_input else [], "WFWorkflowInputContentItemClasses": ["WFStringContentItem", "WFRichTextContentItem", "WFEmailAddressContentItem", "WFGenericFileContentItem"] if takes_input else [],
        "WFWorkflowHasShortcutInputVariables": takes_input, "WFWorkflowHasOutputFallback": False,
        "WFQuickActionSurfaces": [], "WFWorkflowOutputContentItemClasses": [],
        "WFWorkflowActions": actions}

# colori del Comando Rapido: blu scuro, verde, blu
BRAND = os.environ.get("SD_BRAND", "Keepo")
SPECS = [(f"Uscita {BRAND}", movement("out"), 59511, 463140863),
         (f"Entrata {BRAND}", movement("in"), 59511, 431817727),
         (f"Saldo {BRAND}", balance(), 59446, 4282601983),
         (f"Pagamento {BRAND}", payment(), 59446, 463140863),
         (f"Accredito {BRAND}", income_from_email(), 59511, 431817727)]
out = os.environ.get("SD_OUT") or os.path.join(ROOT, "comandi"); os.makedirs(out, exist_ok=True)
for name, actions, glyph, color in SPECS:
    with tempfile.NamedTemporaryFile(suffix=".shortcut", delete=False) as f:
        plistlib.dump(workflow(actions, glyph, color, takes_input=name.startswith(("Pagamento", "Accredito"))), f, fmt=plistlib.FMT_BINARY); raw = f.name
    dest = os.path.join(out, name + ".shortcut")
    r = subprocess.run(["shortcuts", "sign", "--mode", "anyone", "--input", raw, "--output", dest], capture_output=True, text=True)
    print(name, "->", "ok" if r.returncode == 0 and os.path.exists(dest) else ("ERRORE " + r.stderr.strip()))
    os.unlink(raw)
