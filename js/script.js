// Scripts du site Emmanuelle & Durand

// Adresse du script Google (voir google-apps-script/Code.gs, étape « Déployer »).
// Collez-la entre les guillemets :
const RSVP_URL = "";

document.addEventListener("DOMContentLoaded", () => {
  initRsvp();

  initCarrousel();
});

// ---------- RSVP ----------
function initRsvp() {
  const form = document.getElementById("rsvp-form");
  if (!form) return;
  const liste = (typeof INVITES !== "undefined" ? INVITES : []).filter(Boolean);
  const input = document.getElementById("rsvp-nom");
  const box = document.getElementById("rsvp-suggestions");
  const aide = document.getElementById("nom-aide");
  const erreur = document.getElementById("rsvp-erreur");
  const norm = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const index = liste.map((g) => {
    const nom = typeof g === "string" ? g : g.nom;
    const places = typeof g === "string" ? 1 : Math.max(1, parseInt(g.places, 10) || 1);
    return { nom, places, cle: norm(nom), mots: norm(nom).split(" ") };
  });
  const notePlaces = document.getElementById("nom-places");
  const champNombre = document.getElementById("champ-nombre");
  const selNombre = document.getElementById("rsvp-nombre");
  let invite = null;

  // Adapte le formulaire au nombre de places de l'invité
  const majInvite = () => {
    invite = index.find((g) => g.cle === norm(input.value)) || null;
    if (!invite) { notePlaces.hidden = true; majNombre(); return; }
    notePlaces.textContent = invite.places > 1
      ? `Votre invitation est valable pour ${invite.places} personnes, vous compris.`
      : "Invitation nominative, sans accompagnant.";
    notePlaces.hidden = false;
    selNombre.innerHTML = "";
    for (let i = 1; i <= invite.places; i++) {
      const o = document.createElement("option");
      o.value = i; o.textContent = i === 1 ? "1 (moi seul·e)" : i + " personnes";
      selNombre.appendChild(o);
    }
    selNombre.value = invite.places;
    majNombre();
  };
  const vient = () => [...form.querySelectorAll('input[name="ceremonie"]:checked, input[name="diner"]:checked')].some((r) => r.value === "Oui");
  const majNombre = () => { champNombre.hidden = !(invite && invite.places > 1 && vient()); };
  let items = [], actif = -1;

  const fermer = () => { box.hidden = true; input.setAttribute("aria-expanded", "false"); actif = -1; };
  const choisir = (nom) => { input.value = nom; fermer(); aide.hidden = true; input.closest(".champ").classList.remove("invalide"); majInvite(); };
  const surligner = () => [...box.children].forEach((li, i) => li.setAttribute("aria-selected", i === actif));

  input.addEventListener("input", () => {
    aide.hidden = true;
    majInvite();
    const q = norm(input.value);
    if (!liste.length || q.length < 2) return fermer();
    const bouts = q.split(" ");
    items = index.filter((g) => bouts.every((b) => g.mots.some((m) => m.startsWith(b)))).slice(0, 8);
    box.innerHTML = "";
    items.forEach((g, i) => {
      const li = document.createElement("li");
      li.id = "sugg-" + i; li.setAttribute("role", "option"); li.textContent = g.nom;
      li.addEventListener("mousedown", (e) => { e.preventDefault(); choisir(g.nom); });
      box.appendChild(li);
    });
    if (!items.length) {
      fermer();
      aide.textContent = "Nous ne trouvons pas ce nom. Essayez avec votre prénom ou votre nom seul, tel qu’il figure sur votre invitation.";
      aide.hidden = false;
      return;
    }
    actif = -1; box.hidden = false; input.setAttribute("aria-expanded", "true");
  });
  input.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "ArrowDown") { actif = (actif + 1) % items.length; surligner(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { actif = (actif - 1 + items.length) % items.length; surligner(); e.preventDefault(); }
    else if (e.key === "Enter" && actif >= 0) { choisir(items[actif].nom); e.preventDefault(); }
    else if (e.key === "Escape") fermer();
  });
  input.addEventListener("blur", () => setTimeout(fermer, 100));

  // Champs « Oui : précisez »
  form.querySelectorAll("input[type=radio]").forEach((r) => r.addEventListener("change", () => {
    form.querySelectorAll(`input[name="${r.name}"]`).forEach((x) => {
      if (!x.dataset.precision) return;
      const champ = document.getElementById(x.dataset.precision);
      champ.hidden = !x.checked; if (x.checked) champ.focus();
    });
    r.closest(".champ").classList.remove("invalide");
    majNombre();
  }));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    erreur.hidden = true;
    form.querySelectorAll(".invalide").forEach((c) => c.classList.remove("invalide"));
    const d = new FormData(form);
    if (d.get("site_web")) return; // robot
    const manques = [];

    const nom = input.value.trim();
    const trouve = index.find((g) => g.cle === norm(nom));
    if (!nom || (liste.length && !trouve)) {
      manques.push(input);
      if (nom && liste.length) { aide.textContent = "Merci de choisir votre nom dans la liste proposée."; aide.hidden = false; }
    } else if (trouve) input.value = trouve.nom;

    ["ceremonie", "diner", "allergies", "infos"].forEach((n) => { if (!d.get(n)) manques.push(form.querySelector(`input[name="${n}"]`)); });
    if (manques.length) {
      manques.forEach((m) => m.closest(".champ").classList.add("invalide"));
      erreur.textContent = "Merci de compléter les champs en rouge.";
      erreur.hidden = false;
      manques[0].closest(".champ").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!RSVP_URL) {
      erreur.textContent = "Le formulaire n’est pas encore relié au tableau des réponses.";
      erreur.hidden = false; return;
    }

    const envoi = new URLSearchParams({
      nom: input.value.trim(),
      personnes: vient() ? (invite && invite.places > 1 ? selNombre.value : "1") : "0",
      places: invite ? String(invite.places) : "",
      ceremonie: d.get("ceremonie"),
      diner: d.get("diner"),
      allergies: d.get("allergies") === "Oui" ? "Oui : " + (d.get("allergies_detail") || "").trim() : "Non",
      infos: d.get("infos") === "Oui" ? "Oui : " + (d.get("infos_detail") || "").trim() : "Non",
      mot: (d.get("mot") || "").trim(),
    });
    const bouton = form.querySelector("button[type=submit]");
    bouton.disabled = true; bouton.textContent = "Envoi en cours…";
    try {
      await fetch(RSVP_URL, { method: "POST", mode: "no-cors", body: envoi });
      form.hidden = true;
      document.getElementById("rsvp-merci").hidden = false;
      document.getElementById("rsvp-merci").scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      erreur.textContent = "L’envoi n’a pas fonctionné. Vérifiez votre connexion et réessayez.";
      erreur.hidden = false;
      bouton.disabled = false; bouton.textContent = "Envoyer ma réponse";
    }
  });
}

// ---------- Carrousel « Notre histoire » ----------
function initCarrousel() {
  const car = document.querySelector(".carrousel");
  if (!car) return;
  const stage = car.querySelector(".car-stage");
  const slides = [...stage.querySelectorAll("figure")];
  const dotsBox = car.querySelector(".car-dots");
  const n = slides.length;
  const DUREE = 5000; // temps d'affichage de chaque photo (ms)
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let actuel = 0, timer = null, survol = false, visible = false, zoomOuvert = false;
  car.style.setProperty("--duree", DUREE + "ms");
  car.tabIndex = 0;

  // Les images sont proches : on les charge toutes d'emblée
  slides.forEach((f) => f.querySelector("img").loading = "eager");

  // Points de navigation
  const dots = slides.map((_, i) => {
    const d = document.createElement("button");
    d.type = "button"; d.setAttribute("aria-label", `Photo ${i + 1} sur ${n}`);
    d.addEventListener("click", () => { aller(i); relancer(); });
    dotsBox.appendChild(d); return d;
  });

  function afficher() {
    slides.forEach((f, i) => {
      const rel = (i - actuel + n) % n;
      f.classList.toggle("actif", rel === 0);
      f.classList.toggle("apres", rel === 1 && n > 2);
      f.classList.toggle("avant", rel === n - 1 && n > 1);
      f.setAttribute("aria-hidden", rel !== 0);
    });
    dots.forEach((d, i) => {
      d.classList.toggle("actif", i === actuel);
      d.setAttribute("aria-current", i === actuel);
    });
    // relance l'animation de la barre de progression
    const d = dots[actuel]; d.classList.remove("actif"); void d.offsetWidth; d.classList.add("actif");
    if (zoomOuvert) majZoom();
  }
  function aller(i) { actuel = (i + n) % n; afficher(); }
  const suivant = () => aller(actuel + 1);
  const precedent = () => aller(actuel - 1);

  // Lecture automatique
  function enPause() { return survol || !visible || zoomOuvert || document.hidden; }
  function majEtat() { car.classList.toggle("en-pause", enPause()); }
  function relancer() {
    clearTimeout(timer);
    majEtat();
    if (reduit) return;
    car.classList.add("lecture");
    const tic = () => { if (!enPause()) suivant(); timer = setTimeout(tic, DUREE); };
    timer = setTimeout(tic, DUREE);
  }
  // En pause, on attend la reprise sans avancer ; à la reprise, la photo garde son temps complet
  const reprise = () => { majEtat(); if (!enPause()) { afficher(); relancer(); } };

  car.querySelector(".next").addEventListener("click", () => { suivant(); relancer(); });
  car.querySelector(".prev").addEventListener("click", () => { precedent(); relancer(); });
  car.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { suivant(); relancer(); }
    if (e.key === "ArrowLeft") { precedent(); relancer(); }
  });
  car.addEventListener("mouseenter", () => { survol = true; majEtat(); });
  car.addEventListener("mouseleave", () => { survol = false; reprise(); });
  document.addEventListener("visibilitychange", reprise);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; reprise(); }, { threshold: 0.35 }).observe(car);

  // Glisser du doigt (ou de la souris)
  let x0 = null, glisse = false;
  stage.addEventListener("pointerdown", (e) => { x0 = e.clientX; glisse = false; });
  stage.addEventListener("pointermove", (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 10) glisse = true; });
  stage.addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) { dx < 0 ? suivant() : precedent(); relancer(); }
  });
  stage.addEventListener("pointercancel", () => { x0 = null; });

  // Clic : sur une photo voisine on y va, sur la photo du milieu on l'agrandit
  slides.forEach((f, i) => f.addEventListener("click", () => {
    if (glisse) return;
    if (i === actuel) ouvrirZoom(); else { aller(i); relancer(); }
  }));

  // Plein écran
  const zoom = document.createElement("div");
  zoom.className = "car-zoom";
  zoom.setAttribute("role", "dialog"); zoom.setAttribute("aria-modal", "true"); zoom.setAttribute("aria-label", "Photo agrandie");
  const L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  zoom.innerHTML = '<img alt=""><button class="z-prev" type="button" aria-label="Photo précédente">' + L + '</button>' +
    '<button class="z-next" type="button" aria-label="Photo suivante">' + R + '</button>' +
    '<button class="fermer" type="button" aria-label="Fermer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
  document.body.appendChild(zoom);
  const zImg = zoom.querySelector("img");
  function majZoom() { const im = slides[actuel].querySelector("img"); zImg.src = im.src; zImg.alt = im.alt; }
  function ouvrirZoom() { zoomOuvert = true; majZoom(); zoom.classList.add("ouvert"); zoom.querySelector(".fermer").focus(); majEtat(); }
  function fermerZoom() { zoomOuvert = false; zoom.classList.remove("ouvert"); car.focus({ preventScroll: true }); reprise(); }
  zoom.querySelector(".fermer").addEventListener("click", fermerZoom);
  zoom.querySelector(".z-next").addEventListener("click", suivant);
  zoom.querySelector(".z-prev").addEventListener("click", precedent);
  zoom.addEventListener("click", (e) => { if (e.target === zoom) fermerZoom(); });
  document.addEventListener("keydown", (e) => {
    if (!zoomOuvert) return;
    if (e.key === "Escape") fermerZoom();
    if (e.key === "ArrowRight") suivant();
    if (e.key === "ArrowLeft") precedent();
  });
  let zx = null;
  zoom.addEventListener("pointerdown", (e) => zx = e.clientX);
  zoom.addEventListener("pointerup", (e) => {
    if (zx === null) return; const dx = e.clientX - zx; zx = null;
    if (Math.abs(dx) > 40) dx < 0 ? suivant() : precedent();
  });

  afficher();
  relancer();
}
