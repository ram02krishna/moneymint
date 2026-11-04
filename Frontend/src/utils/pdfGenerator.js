import { formatDate } from "./helper";

// jsPDF's built-in fonts have no ₹ glyph (it prints as "¹"), so the PDF spells it "Rs."
const pdfMoney = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TABLE_COLORS = {
  income: [34, 197, 94],
  expense: [220, 38, 38],
  transaction: [124, 58, 237],
};

const kindOf = (item, fallback) => item.type || (item.source ? "income" : fallback);

/**
 * Builds and downloads a PDF report.
 * type: "income" | "expense" for single-kind reports, "transaction" for a mixed list
 * (items then carry their own `type`, and the total is shown as a net amount).
 * The PDF libraries are loaded on demand because they are heavy.
 */
export const generatePDF = async (title, transactions, chartIds = [], type = "income") => {
  const [{ default: jsPDF }, autoTableModule, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    import("html2canvas"),
  ]);

  const autoTable = autoTableModule.default || autoTableModule;
  const doc = new jsPDF();
  const isMixed = type === "transaction";

  const signed = (item) => {
    const amount = Number(item.amount) || 0;
    return kindOf(item, type) === "expense" ? -amount : amount;
  };

  const rows = transactions.map((item) => {
    const amount = isMixed ? signed(item) : Number(item.amount) || 0;
    return [
      formatDate(item.date),
      item.title,
      item.category || item.source || "",
      `${isMixed && amount > 0 ? "+" : ""}${pdfMoney(amount)}`,
    ];
  });

  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`, 14, 27);

  const total = isMixed
    ? transactions.reduce((sum, item) => sum + signed(item), 0)
    : transactions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalLabel = isMixed ? "Net Total" : type === "income" ? "Total Income" : "Total Expense";

  doc.setFontSize(12);
  doc.text(`${totalLabel}: ${pdfMoney(total)}`, 14, 35);

  let finalY = 40;

  if (chartIds.length > 0) {
    doc.text("Analytics Snapshot", 14, finalY);
    finalY += 5;

    for (const id of chartIds) {
      const chartElement = document.getElementById(id);
      if (!chartElement) continue;

      try {
        const canvas = await html2canvas(chartElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          onclone: (clonedDoc) => {
            const element = clonedDoc.getElementById(id);
            if (element) {
              element.style.backgroundColor = "#ffffff";
              element.style.color = "#000000";
            }
          },
        });

        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (finalY + imgHeight > 280) {
          doc.addPage();
          finalY = 20;
        }

        doc.addImage(canvas.toDataURL("image/png"), "PNG", 14, finalY, imgWidth, imgHeight);
        finalY += imgHeight + 10;
      } catch (err) {
        console.error("Error generating PDF chart:", err);
      }
    }
  }

  if (finalY > 250) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFontSize(12);
  doc.text("Transaction Details", 14, finalY);

  autoTable(doc, {
    head: [["Date", "Description", "Category/Source", "Amount"]],
    body: rows,
    startY: finalY + 5,
    theme: "grid",
    styles: { fontSize: 9 },
    columnStyles: { 3: { halign: "right" } },
    headStyles: { fillColor: TABLE_COLORS[type] || TABLE_COLORS.transaction, textColor: [255, 255, 255] },
  });

  const stamp = formatDate(new Date()).replace(/\//g, "-");
  doc.save(`${title.replace(/\s+/g, "_")}_${stamp}.pdf`);
};
