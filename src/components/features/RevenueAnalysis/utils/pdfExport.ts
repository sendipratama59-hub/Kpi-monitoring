import { format, subMonths } from "date-fns";
import { id } from "date-fns/locale";

export const downloadCustomerProducts = async (
  customerData: any,
  filterType: "all" | "up" | "down",
  selectedDate: Date,
  currentMonthName: string,
  periodYear: number,
  setIsDownloadingPdf: (val: boolean) => void
) => {
  if (!customerData || !customerData.products || customerData.products.length === 0) {
    alert("Tidak ada data produk");
    return;
  }
  setIsDownloadingPdf(true);
  try {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    let titleFilter = "";
    if (filterType === "up") titleFilter = " (NAIK)";
    if (filterType === "down") titleFilter = " (TURUN)";
    doc.text(`DETAIL PRODUK${titleFilter} - ${customerData.customer_name.toUpperCase()}`, 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Toko: ${customerData.customer_name}`, 14, 21);
    doc.text(`Periode: ${currentMonthName} ${periodYear}`, 14, 26);

    let filteredProducts = customerData.products;
    if (filterType === "up") {
      filteredProducts = filteredProducts.filter((p: any) => p.omset_current > p.omset_last);
    } else if (filterType === "down") {
      filteredProducts = filteredProducts.filter(
        (p: any) => p.omset_current < p.omset_last || (p.omset_current === 0 && p.omset_last === 0 && p.omset_two_months_ago > 0)
      );
    }

    const tableData = filteredProducts.map((p: any) => {
      let growthStr = "0.0%";
      let growthVal = 0;
      if (p.omset_last > 0) {
        growthVal = ((p.omset_current - p.omset_last) / p.omset_last) * 100;
        growthStr = `${growthVal > 0 ? "+" : ""}${growthVal.toFixed(1)}%`;
      } else if (p.omset_current > 0) {
        growthVal = 100;
        growthStr = "+100.0%";
      } else if (p.omset_current === 0 && p.omset_last === 0 && p.omset_two_months_ago > 0) {
        growthStr = "Pasif";
        growthVal = -100;
      }
      const unit = "Pcs";
      return [
        p.goods_name,
        `${p.omset_current > 0 ? p.omset_current.toLocaleString("id-ID") : "0"}\n\n${p.qty_current} ${unit}`,
        `${p.omset_last > 0 ? p.omset_last.toLocaleString("id-ID") : "0"}\n\n${p.qty_last} ${unit}`,
        `${p.omset_two_months_ago > 0 ? p.omset_two_months_ago.toLocaleString("id-ID") : "0"}\n\n${p.qty_two_months_ago} ${unit}`,
        growthStr,
        growthVal,
      ];
    });

    const currMonthStr = format(selectedDate, "MMMM yyyy", { locale: id });
    const lastMonthStr = format(subMonths(selectedDate, 1), "MMMM yyyy", { locale: id });
    const twoMonthsAgoStr = format(subMonths(selectedDate, 2), "MMMM yyyy", { locale: id });

    autoTable(doc, {
      startY: 36,
      head: [["Produk", currMonthStr, lastMonthStr, twoMonthsAgoStr, "Growth"]],
      body: tableData.map((row: any) => row.slice(0, 5)),
      theme: "grid",
      styles: { fontSize: 8, fontStyle: "normal", lineColor: [200, 200, 200], lineWidth: 0.1, valign: "middle", cellPadding: 3 },
      headStyles: { fillColor: [16, 124, 95], fontStyle: "bold", textColor: [255, 255, 255], halign: "center", valign: "middle" },
      columnStyles: {
        0: { cellWidth: 50, halign: "left" }, 1: { cellWidth: 35, halign: "center" },
        2: { cellWidth: 35, halign: "center" }, 3: { cellWidth: 35, halign: "center" },
        4: { cellWidth: 20, halign: "center" },
      },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 4) {
          const rowData = tableData[data.row.index];
          const growthVal = rowData[5] as number;
          if (growthVal < 0 || growthVal === -100) data.cell.styles.textColor = [220, 38, 38];
          else if (growthVal > 0) data.cell.styles.textColor = [22, 163, 74];
          else data.cell.styles.textColor = [100, 100, 100];
        }
      },
      didDrawCell: (data: any) => {
        if (data.section === "body" && data.column.index >= 1 && data.column.index <= 3) {
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          const yPos = data.cell.y + data.cell.height / 2;
          doc.line(data.cell.x + 2, yPos, data.cell.x + data.cell.width - 2, yPos);
        }
      },
    });

    const custNameStr = customerData.customer_name.replace(/\s+/g, "_");
    const finalFileName = `Selisih_Produk_${custNameStr}_${currentMonthName}_${periodYear}.pdf`;
    doc.save(finalFileName);
  } catch (e) {
    console.error("Error generating PDF", e);
  } finally {
    setIsDownloadingPdf(false);
  }
};
