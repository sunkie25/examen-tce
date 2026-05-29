# Chestionar TCE

Aplicatie statica pentru invatare si simulare de chestionar TCE, pregatita pentru GitHub Pages.

## Fisiere

- `index.html` - pagina principala.
- `styles.css` - designul in stil chestionar auto.
- `app.js` - logica pentru mod invatare si chestionar.
- `questions.js` - intrebari extrase din PDF si cheia de raspuns.

## Publicare pe GitHub Pages

1. Pune aceste fisiere intr-un repository GitHub.
2. In Settings -> Pages, alege branch-ul si folderul `/root`.
3. Deschide URL-ul generat de GitHub Pages.

Nota: PDF-ul contine 139 intrebari detectabile textual. Unele intrebari cu formule au fost marcate cu `needsPdfReview` in `questions.js`, deoarece formulele nu se extrag curat din PDF.
