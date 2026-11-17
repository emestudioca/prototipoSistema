import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { IProduct } from "@gestionate/core/shared";

const currency = (v: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(v);

export function exportProductsToExcel(products: IProduct[]) {
  const data = products.map((p) => ({
    SKU: p.sku,
    Nombre: p.name,
    Descripción: p.description,
    Categoría: p.category,
    Precio: p.price,
    Costo: p.cost,
    Stock: p.stock,
    "Stock Mínimo": p.minStock,
    Activo: p.active ? "Sí" : "No",
    ...Object.fromEntries(
      Object.entries(p.attributes || {}).map(([k, v]) => [k, String(v)])
    ),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 8 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Productos");
  XLSX.writeFile(wb, `productos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportProductsToPDF(products: IProduct[]) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.text("Listado de Productos", 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-AR")} · ${products.length} productos`, 14, 27);

  autoTable(doc, {
    startY: 32,
    head: [["SKU", "Nombre", "Categoría", "Precio", "Costo", "Stock", "Mín."]],
    body: products.map((p) => [
      p.sku,
      p.name,
      p.category,
      currency(p.price),
      currency(p.cost),
      String(p.stock),
      String(p.minStock),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [63, 70, 229] },
    alternateRowStyles: { fillColor: [248, 249, 252] },
  });

  doc.save(`productos_${new Date().toISOString().slice(0, 10)}.pdf`);
}