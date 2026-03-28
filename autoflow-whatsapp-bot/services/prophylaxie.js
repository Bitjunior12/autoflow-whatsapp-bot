// services/prophylaxie.js
const mongoose = require("mongoose");
const { sendWhatsAppMessage } = require("./whatsapp");

// Schéma bande d'élevage
const bandeSchema = new mongoose.Schema({
  phone:        { type: String, required: true },
  nom:          { type: String },
  typeBande:    { type: String }, // "chair" ou "ponte"
  nombreSujets: { type: Number },
  dateMiseEnPlace: { type: Date, required: true },
  race:         { type: String },
  alertesActives: { type: Boolean, default: true },
  alertesEnvoyees: [{ type: String }], // ex: ["J3", "J7", "J14"]
}, { timestamps: true });

const Bande = mongoose.model("Bande", bandeSchema);

// Calendrier de prophylaxie standard (poulets de chair)
const CALENDRIER_CHAIR = [
  { jour: 1,  message: "🐣 *J1 — Mise en place*\n\nVérifiez :\n✓ Température : 32-33°C\n✓ Abreuvoirs : eau sucrée + vitamines\n✓ Litière sèche et propre\n✓ Densité : max 10 sujets/m²" },
  { jour: 3,  message: "💊 *J3 — Vitamines & électrolytes*\n\n✓ Administrer vitamines A, D3, E\n✓ Électrolytes dans l'eau\n✓ Observer la consommation d'eau\n✓ Température : 30-31°C" },
  { jour: 7,  message: "💉 *J7 — Vaccin Newcastle (1ère dose)*\n\n✓ Vaccin Newcastle souche La Sota\n✓ Administration : eau de boisson\n✓ Retirer l'eau 2h avant vaccination\n✓ Température : 28-29°C" },
  { jour: 10, message: "🛡️ *J10 — Anticoccidien préventif*\n\n✓ Administrer anticoccidien\n✓ Durée : 5 jours consécutifs\n✓ Vérifier la litière (trop humide = coccidiose)\n✓ Peser un échantillon de 10 sujets" },
  { jour: 14, message: "📊 *J14 — Pesée & contrôle*\n\n✓ Poids moyen attendu : 350-400g\n✓ Vaccin Gumboro (Bursite)\n✓ Réduire température à 26°C\n✓ Augmenter espace si nécessaire" },
  { jour: 18, message: "💉 *J18 — Rappel Gumboro*\n\n✓ 2ème dose vaccin Gumboro\n✓ Observer les fientes (normalité)\n✓ Vérifier ventilation\n✓ Poids moyen attendu : 700-800g" },
  { jour: 21, message: "🔄 *J21 — Rappel Newcastle*\n\n✓ 2ème dose Newcastle\n✓ Transition aliment démarrage → croissance\n✓ Poids moyen attendu : 900g-1kg\n✓ Température ambiante désormais suffisante" },
  { jour: 28, message: "📈 *J28 — Contrôle croissance*\n\n✓ Poids moyen attendu : 1,4-1,6 kg\n✓ Surveiller la consommation d'aliment\n✓ Vérifier absence de boiteries\n✓ Préparer transition vers aliment finition" },
  { jour: 35, message: "🏁 *J35 — Pré-abattage*\n\n✓ Poids moyen attendu : 2-2,2 kg\n✓ Retrait anticoccidien 5 jours avant abattage\n✓ Jeûne alimentaire 8h avant enlèvement\n✓ Préparer la logistique de vente\n\n🎉 Félicitations, votre bande touche à sa fin !" },
];

// Calendrier de prophylaxie standard (poules pondeuses)
const CALENDRIER_PONTE = [
  { jour: 1,  message: "🐣 *J1 — Mise en place pondeuses*\n\n✓ Température : 32°C\n✓ Eau sucrée + vitamines\n✓ Lumière : 23h/jour les 3 premiers jours" },
  { jour: 7,  message: "💉 *J7 — Vaccin Newcastle + Bronchite*\n\n✓ Souche La Sota + Mass\n✓ Eau de boisson\n✓ Réduire lumière à 20h/jour" },
  { jour: 14, message: "🛡️ *J14 — Vaccin Gumboro*\n\n✓ 1ère dose Gumboro\n✓ Poids moyen attendu : 120-130g\n✓ Lumière : 18h/jour" },
  { jour: 21, message: "💉 *J21 — Rappels vaccins*\n\n✓ Rappel Newcastle\n✓ Rappel Bronchite infectieuse\n✓ Lumière : 16h/jour" },
  { jour: 42, message: "📊 *J42 — Contrôle 6 semaines*\n\n✓ Poids moyen attendu : 500-600g\n✓ Transition aliment poussin → poulette\n✓ Réduire lumière à 12h/jour progressivement" },
  { jour: 112, message: "🥚 *J112 — Pré-ponte (16 semaines)*\n\n✓ Transition aliment poulette → pondeuse\n✓ Augmenter lumière à 14h/jour\n✓ Ponte attendue vers J126 (18 semaines)" },
  { jour: 126, message: "🥚 *J126 — Début de ponte*\n\n✓ Lumière : 16h/jour\n✓ Vérifier les nids (1 nid / 4 poules)\n✓ Taux de ponte attendu : 5-10% cette semaine\n✓ Aliment pondeuse riche en calcium" },
];

// Enregistre une nouvelle bande
async function enregistrerBande(phone, data) {
  const { nom, typeBande, nombreSujets, dateMiseEnPlace, race } = data;
  const bande = await Bande.create({
    phone, nom, typeBande, nombreSujets,
    dateMiseEnPlace: new Date(dateMiseEnPlace),
    race
  });
  return bande;
}

// Récupère les bandes actives d'un éleveur
async function getBandesActives(phone) {
  return await Bande.find({ phone, alertesActives: true });
}

// Calcule les alertes à envoyer aujourd'hui
async function verifierEtEnvoyerAlertes() {
  const bandes = await Bande.find({ alertesActives: true });
  const today = new Date();

  for (const bande of bandes) {
    const jourBande = Math.floor(
      (today - bande.dateMiseEnPlace) / (1000 * 60 * 60 * 24)
    );

    const calendrier = bande.typeBande === "ponte" 
      ? CALENDRIER_PONTE 
      : CALENDRIER_CHAIR;

    for (const alerte of calendrier) {
      const cle = `J${alerte.jour}`;
      if (alerte.jour === jourBande && !bande.alertesEnvoyees.includes(cle)) {
        try {
          await sendWhatsAppMessage(
            bande.phone,
            `🔔 *Rappel élevage — ${bande.nom || "votre bande"}*\n\n${alerte.message}\n\n↩️ Tapez *menu* pour voir nos services`
          );
          await Bande.updateOne(
            { _id: bande._id },
            { $push: { alertesEnvoyees: cle } }
          );
          console.log(`✅ Alerte ${cle} envoyée à ${bande.phone}`);
        } catch (err) {
          console.error(`❌ Erreur alerte ${cle} :`, err.message);
        }
      }
    }
  }
}

module.exports = { enregistrerBande, getBandesActives, verifierEtEnvoyerAlertes, Bande };