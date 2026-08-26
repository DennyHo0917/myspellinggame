/* global console, process */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requestedInput = process.argv[2];
const inputCandidates = requestedInput
  ? [requestedInput]
  : [
      "data/word_sentences.csv",
      "documents/myspellinggame_english_sentence_library_cleaned.csv",
    ];
const inputPath = inputCandidates
  .map((file) => path.resolve(root, file))
  .find((file) => fs.existsSync(file));
const outputPath = path.resolve(root, "data/word_sentences_seed.sql");
const expectedRows = 29732;

if (!inputPath) {
  throw new Error(`Input CSV not found. Tried: ${inputCandidates.join(", ")}`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  if (field.length > 0 || row.length > 0) {
    row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
    rows.push(row);
  }
  return rows;
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

const rows = parseCsv(fs.readFileSync(inputPath, "utf8"));
if (rows.length === 0) throw new Error("CSV is empty");

const headers = rows.shift();
const columns = new Map(headers.map((header, index) => [header.trim(), index]));
for (const required of ["word", "simple_sentence", "difficult_sentence"]) {
  if (!columns.has(required))
    throw new Error(`CSV is missing required column: ${required}`);
}

const words = new Set();
const inserts = [];
const duplicateWords = [];
for (const [rowIndex, row] of rows.entries()) {
  const line = rowIndex + 2;
  const word = (row[columns.get("word")] ?? "").trim().toLowerCase();
  const simpleSentence = (row[columns.get("simple_sentence")] ?? "").trim();
  const difficultSentence = (
    row[columns.get("difficult_sentence")] ?? ""
  ).trim();
  if (!word) throw new Error(`Line ${line}: word is empty`);
  if (!simpleSentence)
    throw new Error(`Line ${line}: simple_sentence is empty for ${word}`);
  if (!difficultSentence)
    throw new Error(`Line ${line}: difficult_sentence is empty for ${word}`);
  if (words.has(word)) duplicateWords.push(word);
  words.add(word);
  inserts.push(
    `INSERT INTO word_sentences (word, simple_sentence, difficult_sentence) VALUES (${sqlString(word)}, ${sqlString(simpleSentence)}, ${sqlString(difficultSentence)});`,
  );
}

if (rows.length !== expectedRows) {
  throw new Error(`Input rows: ${rows.length}; expected ${expectedRows}`);
}
if (duplicateWords.length > 0) {
  throw new Error(
    `Duplicate words (${duplicateWords.length}): ${[...new Set(duplicateWords)].join(", ")}`,
  );
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${inserts.join("\n")}\n`);
const sizeMb = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`Input rows: ${rows.length}`);
console.log(`Unique words: ${words.size}`);
console.log(`Generated inserts: ${inserts.length}`);
console.log(`Output file: ${path.relative(root, outputPath)}`);
console.log(`File size: ${sizeMb} MB`);
