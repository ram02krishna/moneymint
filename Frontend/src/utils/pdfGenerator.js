import moment from "moment";

// function to create a pdf with on-demand lazy loading of heavy PDF libraries
export let generatePDF = async (
  title,
  transactions,
  chartIds = [],
  type = "income",
) => {
  const [{ default: jsPDF }, autoTableModule, { default: html2canvas }] =
    await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
      import("html2canvas"),
    ]);

  const autoTable = autoTableModule.default || autoTableModule;
  let doc = new jsPDF();
  let tableColumn = ["Date", "Description", "Category/Source", "Amount"];
  let tableRows = [];

  for (let i = 0; i < transactions.length; i++) {
    let item = transactions[i];
    let rowData = [
      moment(item.date).format("DD/MM/YYYY"),
      item.title,
      item.category || item.source,
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(item.amount),
    ];
    tableRows.push(rowData);
  }

  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.text(`Generated on: ${moment().format("MMM Do, YYYY h:mm A")}`, 14, 27);

  // total amount
  let totalAmount = 0;
  for (let i = 0; i < transactions.length; i++) {
    totalAmount += Number(transactions[i].amount);
  }

  doc.setFontSize(12);
  let typeText = type === "income" ? "Income" : "Expense";
  doc.text(
    `Total ${typeText}: ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalAmount)}`,
    14,
    35,
  );

  let finalY = 40;

  // get the charts
  if (chartIds.length > 0) {
    doc.text("Analytics Snapshot", 14, finalY);
    finalY += 5;

    for (let i = 0; i < chartIds.length; i++) {
      let id = chartIds[i];
      let chartElement = document.getElementById(id);
      if (chartElement) {
        try {
          let canvas = await html2canvas(chartElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            onclone: (clonedDoc) => {
              let element = clonedDoc.getElementById(id);
              if (element) {
                element.style.backgroundColor = "#ffffff";
                element.style.color = "#000000";
              }
            },
          });
          let imgData = canvas.toDataURL("image/png");

          let imgWidth = 180;
          let imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (finalY + imgHeight > 280) {
            doc.addPage();
            finalY = 20;
          }

          doc.addImage(imgData, "PNG", 14, finalY, imgWidth, imgHeight);
          finalY += imgHeight + 10;
        } catch (err) {
          console.error("Error generating PDF chart:", err);
          doc.setFontSize(10);
          doc.setTextColor(255, 0, 0);
          doc.text(`(Chart capture failed: ${err.message})`, 14, finalY + 10);
          finalY += 20;
          doc.setTextColor(40, 40, 40);
        }
      }
    }
  }

  // make table
  if (finalY > 250) {
    doc.addPage();
    finalY = 20;
  }

  doc.text("Transaction Details", 14, finalY);

  let tableColor = [124, 58, 237];
  if (type === "income") {
    tableColor = [34, 197, 94];
  } else if (type === "expense") {
    tableColor = [220, 38, 38];
  }

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: finalY + 5,
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: {
      fillColor: tableColor,
      textColor: [255, 255, 255],
    },
  });

  // Save pdf file
  doc.save(
    `${title.replace(/\s+/g, "_")}_${moment().format("DD-MM-YYYY")}.pdf`,
  );
};
