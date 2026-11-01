#!/usr/bin/env node
// Nergora: .github/workflows/*.yml bekçisi (paylaşılan kopya — Nergora/.github).
//
// NEDEN: bir workflow dosyasında **tırnaksız** bir değerin içinde ": " (iki nokta + boşluk)
// geçemez. YAML bunu reddeder ("mapping values are not allowed in this context") ve GitHub
// dosyayı hiç parse edemez; o zaman:
//   - koşu 0 job ile "failure" olur, log bile çıkmaz,
//   - workflow'un adı dosya yolu olarak görünür (name okunamaz),
//   - `on:` filtreleri uygulanmaz, yani her branch'te koşar.
// Bu, nergora-platform'da version.yml'de günlerce sessizce bozuk duran hataydı ve aynı gün
// üç kez daha tekrarlandı (bir job adında, bir iş adında). Bütün bir workflow'u tek bir
// tırnak yüzünden kaybetmenin bedeli çok yüksek — bu yüzden commit öncesi koşar.
//
// Blok skalerlerin gövdesi (`run: |` altındaki satırlar) ve yorumlar atlanır; oralarda ": "
// serbesttir. Tırnaklı değerler ve akış/etiket ile başlayanlar da serbesttir.
// `postgres:18.3` gibi iki nokta+boşluksuz değerler sorun değildir.
//
// KULLANIM (çağıran repo kökünden):
//   node <bu-dosya>                       # $(pwd)/.github/workflows
//   node <bu-dosya> <dizin>               # verilen dizin
import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const directory = resolve(process.argv[2] ?? ".github/workflows")

let entries
try {
  entries = readdirSync(directory)
} catch {
  console.error(`HATA: dizin okunamadi: ${directory}`)
  process.exit(1)
}

const files = entries.filter((name) => name.endsWith(".yml") || name.endsWith(".yaml")).sort()

if (files.length === 0) {
  console.error(`HATA: ${directory} altinda hic workflow bulunamadi.`)
  process.exit(1)
}

const problems = []

for (const file of files) {
  const lines = readFileSync(resolve(directory, file), "utf8").split("\n")
  // Bir blok skalerin (| veya >) basladigi satirin girintisi; -1 = blok yok.
  let blockIndent = -1

  lines.forEach((line, index) => {
    const text = line.replace(/\r$/, "")
    const indent = text.length - text.trimStart().length

    if (blockIndent >= 0) {
      // Blok skalerin govdesi: bos satirlar ve daha derin girintili satirlar.
      if (text.trim() === "" || indent > blockIndent) return
      blockIndent = -1
    }

    const trimmed = text.trimStart()
    if (trimmed === "" || trimmed.startsWith("#")) return

    // "- key: value" listesindeki anahtari da yakala.
    const entry = trimmed.replace(/^-\s+/, "")
    const match = entry.match(/^([\w.$-]+):(?:\s+(.*))?$/)
    if (!match) return

    const value = (match[2] ?? "").trim()
    if (value === "") return
    if (/^[|>]/.test(value)) {
      blockIndent = indent
      return
    }
    if (/^["'[{*&!]/.test(value)) return

    const withoutComment = value.replace(/\s+#.*$/, "")
    if (withoutComment.includes(": ")) {
      problems.push({ file, line: index + 1, text: trimmed })
    }
  })
}

if (problems.length > 0) {
  console.error("Workflow YAML gecersiz: tirnaksiz bir degerin icinde ': ' var.")
  console.error("YAML bunu reddeder; GitHub dosyayi hic parse edemez (0 job'lu kosu).\n")
  for (const problem of problems) {
    console.error(`  ${problem.file}:${problem.line}`)
    console.error(`    ${problem.text}`)
  }
  console.error('\nDegeri cift tirnak icine alin:  key: "... : ..."')
  process.exit(1)
}

console.log(`Workflow YAML temiz: ${files.length} dosya (${directory})`)
