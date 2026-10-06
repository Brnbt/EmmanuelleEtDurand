// Scripts du site Emmanuelle & Durand

// Adresse du script Google (voir google-apps-script/Code.gs, étape « Déployer »).
// Collez-la entre les guillemets :
const RSVP_URL = "";

document.addEventListener("DOMContentLoaded", () => {
  initRsvp();

  // Carrousel « Notre histoire » : flèches + défilement automatique
  const car = document.querySelector(".carrousel");
  if (!car) return;
  const track = car.querySelector(".car-track");
  const slides = [...track.children];
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const indexActuel = () => {
    const centre = track.scrollLeft + track.clientWidth / 2;
    let best = 0, dist = Infinity;
    slides.forEach((s, i) => {
      const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - centre);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  };
  const aller = (i) => {
    const s = slides[(i + slides.length) % slides.length];
    track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2 });
  };

  car.querySelector(".prev").addEventListener("click", () => aller(indexActuel() - 1));
  car.querySelector(".next").addEventListener("click", () => aller(indexActuel() + 1));

  if (reduit) return;
  let pause = false, visible = false;
  ["mouseenter", "focusin", "pointerdown"].forEach(e => car.addEventListener(e, () => pause = true));
  ["mouseleave", "focusout"].forEach(e => car.addEventListener(e, () => pause = false));
  new IntersectionObserver(([e]) => visible = e.isIntersecting, { threshold: 0.4 }).observe(car);
  setInterval(() => { if (!pause && visible) aller(indexActuel() + 1); }, 4500);
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
