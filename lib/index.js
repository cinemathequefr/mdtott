const fs = require("fs");
const { promisify } = require("util");
const iconv = require("iconv-lite");
const cudm = require("./cudm.js");
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function main(path) {
  let data = "";
  try {
    data = await readFile(path, "utf-8");
  } catch (e) {
    if ((e.errno = -4058)) {
      console.log(`ERREUR : le fichier ${path} n'existe pas.`);
      console.log(
        "Rappel : Les noms de fichiers contenant des espaces doivent être placés entre guillemets doubles."
      );
      process.exit(1);
    }
  }

  data = cudm(data);
  data = nbsp(data, "<0x00A0>");

  // Traitements ad hoc Tagged Text
  data = data.replace(/\\/g, ""); // Retire tous les backslash

  // Italique et gras
  // data = data.replace(/(?:\*\*)(.*?)(?:\*\*)/g, "<ct:Bold>$1<ct:>"); // Incompatibilité avec italique (TODO: cf journal 03/12/19)
  data = data.replace(/_([^_]*)_/g, "<ct:Italic>$1<ct:>");

  // Autre balisage Markdown
  // Pour le moment, on utilise un balisage ad hoc pour la maquette existante
  data = data.replace(
    /^\s*(\n)?#\s(.+)/gm,
    "<pstyle:BLEU:<0x2022><0x2022>GTITRE VIOLET TXT COURANT>$2"
  );
  data = data.replace(
    /^\s*(\n)?##\s(.+)/gm,
    "<pstyle:BLEU:<0x2022><0x2022>INTER VIOLETS>$2"
  );
  data = data.replace(
    /^\s*(\n)?(.+)/gm,
    "<pstyle:BLEU:<0x2022><0x2022> TXT COURANT>$2"
  );

  // data = data.replace(/^\s*(\n)?#\s(.+)/gm, "[TITRE1]$2");
  // data = data.replace(/^\s*(\n)?##\s(.+)/gm, "[TITRE2]$2");
  // data = data.replace(/^\s*(\n)?(.+)/gm, "<pstyle:>$2"); // Paragraphe normal

  data = data.replace(/<sup>(.*?)<\/sup>/g, "<cp:Superscript>$1<cp:>"); // Balises <sup>
  data = data.replace(/\[\^(\d+)\](?!:)/g, "<cp:Superscript>$1<cp:>"); // Appels de note
  data = data.replace(/\[\^(\d+)\]:/g, "$1."); // Notes

  data = data.replace(/–|&ndash;/g, "<0x2013>"); // Demi-cadratin
  data = data.replace(/—|&mdash;/g, "<0x2014>"); // Cadratin
  data = data.replace(/'/g, "<0x2019>"); // Apostrophe droite => apostrophe "typographique"
  data = data.replace(/Œ/g, "<0x0152>"); // Œ
  data = data.replace(/œ/g, "<0x0153>"); // œ

  // En-tête
  data = `<ANSI-WIN>
<vsn:8>
${data}`;

  data = data.replace(/(?=[^\r])(\n)/g, "\r\n"); // Normalisation finale des sauts de ligne en \r\n

  try {
    let outputPath = path.replace(/(.+).md/, "$1.txt");
    await writeFile(outputPath, iconv.encode(data, "win1252"), "latin1");
    console.log(`SUCCÈS : le fichier ${outputPath} a été écrit.`);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}

/**
 * nbsp
 * Remplace les espaces en position d'insécable (cas usuels) par un insécable.
 * @param {string} str
 * @param {string} rep Chaîne à utiliser pour exprimer l'espace insécable (par défaut, entité HTML `&nbsp;`).
 * @return {string}
 */
function nbsp(str, rep = "&nbsp;") {
  if (!str) return;
  let o = str;
  o = o.replace(/(\x20)([\?:!;\xBB])/gi, `${rep}$2`); // Remplace un espace par un espace insécable dans les cas usuels
  o = o.replace(/(\xAB)(\x20)/gi, `$1${rep}`); // Remplace un espace par un espace insécable après un guillemet français ouvrant
  o = o.replace(/(\s–)/gi, `${rep}–`); // Demi-cadratins
  o = o.replace(/(–\s)/gi, `–${rep}`); // Demi-cadratins
  return o;
}

module.exports = main;
