const PDFDocument = require("pdfkit");

const generateDevisPDF = (devis) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // ══════════════════════════════
      // EN-TÊTE
      // ══════════════════════════════
      doc.fontSize(20).font("Helvetica-Bold")
        .text("LE PARTENAIRE DES ÉLEVEURS", { align: "center" });

      doc.fontSize(10).font("Helvetica")
        .text("Yopougon, 2ème Barrique avant le marché Bagnon", { align: "center" })
        .text("Abobo-N'Dotré, Carrefour Terre Rouge", { align: "center" })
        .text("Tél : (+225) 01 53 21 74 42", { align: "center" });

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // ══════════════════════════════
      // TITRE DOCUMENT
      // ══════════════════════════════
      doc.fontSize(16).font("Helvetica-Bold")
        .text("FACTURE PROFORMA", { align: "center" });

      doc.moveDown(0.5);

      // ══════════════════════════════
      // INFOS DEVIS
      // ══════════════════════════════
      const date = new Date().toLocaleDateString("fr-FR");
      const numero = `DEV-${Date.now().toString().slice(-6)}`;

      doc.fontSize(10).font("Helvetica")
        .text(`N° Devis : ${numero}`)
        .text(`Date : ${date}`)
        .text(`Validité : 7 jours`);

      doc.moveDown();

      // ══════════════════════════════
      // INFOS CLIENT
      // ══════════════════════════════
      doc.fontSize(12).font("Helvetica-Bold").text("INFORMATIONS CLIENT");
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font("Helvetica")
        .text(`Nom : ${devis.nom}`)
        .text(`Téléphone : +${devis.phone}`)
        .text(`Ville : ${devis.ville}`);

      doc.moveDown();

      // ══════════════════════════════
      // TABLEAU PRODUITS
      // ══════════════════════════════
      doc.fontSize(12).font("Helvetica-Bold").text("DÉTAIL DE LA COMMANDE");
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      const tableTop = doc.y;
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Désignation", 50, tableTop);
      doc.text("Qté", 300, tableTop);
      doc.text("Prix Unit.", 370, tableTop);
      doc.text("Total", 460, tableTop);

      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown(0.5);

      doc.font("Helvetica");
      let totalGeneral = 0;

      devis.items.forEach((item) => {
        const y = doc.y;
        const total = item.quantite * item.prixUnitaire;
        totalGeneral += total;

        doc.text(item.designation, 50, y);
        doc.text(item.quantite.toString(), 300, y);
        doc.text(`${item.prixUnitaire.toLocaleString("fr-FR")} FCFA`, 370, y);
        doc.text(`${total.toLocaleString("fr-FR")} FCFA`, 460, y);
        doc.moveDown();
      });

      // ══════════════════════════════
      // TOTAL
      // ══════════════════════════════
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica-Bold")
        .text(`TOTAL GÉNÉRAL : ${totalGeneral.toLocaleString("fr-FR")} FCFA`,
          { align: "right" });

      doc.moveDown();

      // ══════════════════════════════
      // CONDITIONS
      // ══════════════════════════════
      doc.fontSize(9).font("Helvetica")
        .text("CONDITIONS :", { underline: true })
        .text("• Paiement : Mobile Money (Wave, Orange Money, MTN) ou espèces")
        .text("• Livraison : À définir avec le conseiller")
        .text("• Ce devis est valable 7 jours à compter de la date d'émission");

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // ══════════════════════════════
      // PIED DE PAGE
      // ══════════════════════════════
      doc.fontSize(9).font("Helvetica-Oblique")
        .text("Merci de faire confiance au Partenaire des Éleveurs",
          { align: "center" })
        .text("Pour toute question : (+225) 01 53 21 74 42",
          { align: "center" });

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateDevisPDF };