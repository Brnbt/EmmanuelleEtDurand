/**
 * RSVP — Emmanuelle & Durand
 * Reçoit les réponses du formulaire du site et les range dans ce Google Sheet.
 *
 * INSTALLATION (une seule fois, ~5 minutes) :
 * 1. Créez un nouveau Google Sheet (ex. « RSVP Mariage »).
 * 2. Menu Extensions > Apps Script. Effacez le contenu et collez TOUT ce fichier. Enregistrez.
 * 3. Bouton « Déployer » > « Nouveau déploiement » > roue dentée > « Application Web ».
 *      - Exécuter en tant que : Moi
 *      - Qui a accès : Tout le monde
 *    Cliquez « Déployer », autorisez l'accès avec votre compte Google.
 * 4. Copiez l'« URL de l'application Web » (se termine par /exec)
 *    et collez-la dans js/script.js, à la ligne :  const RSVP_URL = "";
 *
 * Si un invité répond deux fois, sa ligne est mise à jour (pas de doublon).
 */

const ONGLET = "Réponses";
const ENTETES = ["Date", "Nom & prénom", "Places prévues", "Nombre de personnes", "Cérémonie religieuse", "Dîner",
                 "Allergies / restrictions", "Hébergement / transport", "Petit mot"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = e.parameter;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(ONGLET) || ss.insertSheet(ONGLET);
    if (sh.getLastRow() === 0) {
      sh.appendRow(ENTETES);
      sh.getRange(1, 1, 1, ENTETES.length).setFontWeight("bold");
      sh.setFrozenRows(1);
    }
    const ligne = [new Date(), p.nom || "", Number(p.places) || "", Number(p.personnes) || 0, p.ceremonie || "", p.diner || "",
                   p.allergies || "", p.infos || "", p.mot || ""];

    // Mise à jour si ce nom a déjà répondu
    const n = sh.getLastRow() - 1;
    let rang = -1;
    if (n > 0) {
      const noms = sh.getRange(2, 2, n, 1).getValues().map(r => String(r[0]).trim().toLowerCase());
      const i = noms.indexOf(String(p.nom || "").trim().toLowerCase());
      if (i >= 0) rang = i + 2;
    }
    if (rang > 0) sh.getRange(rang, 1, 1, ligne.length).setValues([ligne]);
    else sh.appendRow(ligne);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
