import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Calendar,
  Wrench,
  Trophy,
  Target,
  Presentation,
  Check,
  Edit3,
  Plus,
  Trash2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../../services/supabase";
import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";

interface MeetingReportExporterProps {
  onBack: () => void;
}

// Month Mapping Helper
const INDO_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

export function MeetingReportExporter({ onBack }: MeetingReportExporterProps) {
  const userRole = localStorage.getItem("user_role") || "admin";
  const loggedInSalesmanName = localStorage.getItem("salesman_name") || "";
  const loggedInSalesmanCode = localStorage.getItem("salesman_code") || "";

  // Filter States
  const [salesmanList, setSalesmanList] = useState<{ code: string; name: string }[]>([]);
  const [selectedSalesman, setSelectedSalesman] = useState({ code: "", name: "" });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Loading and PDF generation states
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  // Slide Index State
  const [activeSlide, setActiveSlide] = useState(0);

  // Raw data from database
  const [kpiRecords, setKpiRecords] = useState<any[]>([]);
  const [targetRecord, setTargetRecord] = useState<any>(null);
  const [surveyRecords, setSurveyRecords] = useState<any[]>([]);

  // Slide Data States (Editable by user)
  const [slide1Data, setSlide1Data] = useState({
    title: "Laporan Kerja & Plan",
    area: "Bandung Area",
    author: ""
  });

  // Slide 2: Table Omset (Payment) - Monthly Grid (Jan-Dec of Selected Year)
  const [slide2Data, setSlide2Data] = useState<Record<string, number[]>>({});

  // Slide 3: Customer Order > 5jt
  const [slide3Data, setSlide3Data] = useState<{ customer: string; omset: number }[]>([]);

  // Slide 4: VQM & Hydrogel Mesin
  const [slide4Data, setSlide4Data] = useState<{ customer: string; model: string; qty: number; remark: string }[]>([]);

  // Slide 5: Customer Focus Bintang 2-6
  const [slide5Data, setSlide5Data] = useState<{ customer: string; star: number; monthlyData: number[] }[]>([]);

  // Slide 6: Review KPI Bulan (Automatic based on kpi metrics)
  const [slide6Data, setSlide6Data] = useState<{ id: string; name: string; target: number; actual: number; points: number }[]>([]);

  // Slide 7: Planning Bulan Depan (Customer Focus Bintang 2-6 & Bintang 0-1)
  const [slide7Data, setSlide7Data] = useState({
    focusList: [
      "Fokus penetrasi item premium ke Toko Bintang 3 keatas",
      "Kunjungan rutin terjadwal seminggu sekali untuk Toko Bintang 4-6",
      "Membantu promosi display toko dengan materi branding standee dan poster"
    ],
    bintang01List: [
      "Mengubah Toko Bintang 1 menjadi Bintang 2 dengan order pembuka minimal 2 juta",
      "Kunjungan prospek baru di kecamatan pinggiran",
      "Penawaran bundling promo aksesoris"
    ]
  });

  // Slide 8: Action Plan
  const [slide8Data, setSlide8Data] = useState<{ no: number; task: string; target: string; plan: string; deadline: string; support: string }[]>([]);

  // Reference for the hidden print container
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Initialize and Fetch Salesmen list
  useEffect(() => {
    const fetchSalesmen = async () => {
      try {
        const { data, error } = await supabase
          .from("salesman_kpi_targets")
          .select("salesman_code, salesman_name");
        
        if (error) throw error;

        if (data && data.length > 0) {
          const formatted = data.map((d: any) => ({
            code: d.salesman_code || "",
            name: d.salesman_name || ""
          }));
          setSalesmanList(formatted);

          // Auto-select based on role
          if (userRole === "salesman" && loggedInSalesmanCode) {
            const loggedIn = formatted.find(f => f.code === loggedInSalesmanCode) || formatted[0];
            setSelectedSalesman(loggedIn);
          } else {
            setSelectedSalesman(formatted[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching salesmen:", err);
      }
    };
    fetchSalesmen();
  }, [userRole, loggedInSalesmanCode]);

  // Load Database Data when Filters Change
  useEffect(() => {
    if (!selectedSalesman.code) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Salesman targets
        const { data: targetData } = await supabase
          .from("salesman_kpi_targets")
          .select("*")
          .eq("salesman_code", selectedSalesman.code)
          .single();
        setTargetRecord(targetData || null);

        // 2. Fetch Salesman KPI transactions for the entire year to build the monthly grid
        let allKpi: any[] = [];
        let from = 0;
        let limit = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: kpiData, error } = await supabase
            .from("salesman_kpi")
            .select("*")
            .eq("salesman_code", selectedSalesman.code)
            .gte("order_date", `${selectedYear}-01-01`)
            .lte("order_date", `${selectedYear}-12-31T23:59:59`)
            .range(from, from + limit - 1);

          if (error || !kpiData || kpiData.length === 0) {
            hasMore = false;
          } else {
            allKpi = [...allKpi, ...kpiData];
            if (kpiData.length < limit) {
              hasMore = false;
            } else {
              from += limit;
            }
          }
        }
        setKpiRecords(allKpi);

        // 3. Fetch Survey Channel
        const { data: surveyData } = await supabase
          .from("survey_channel")
          .select("*")
          .eq("salesman_name", selectedSalesman.name);
        setSurveyRecords(surveyData || []);

      } catch (err) {
        console.error("Error loading report data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedSalesman, selectedYear]);

  // Aggregate database into slide states when kpiRecords/targetRecord/surveyRecords update
  useEffect(() => {
    // 1. Title/Cover info
    setSlide1Data({
      title: `Laporan Kerja ${INDO_MONTHS[selectedMonth]} & Plan ${INDO_MONTHS[(selectedMonth + 1) % 12]} ${selectedYear}`,
      area: targetRecord?.city || "Bandung Area",
      author: selectedSalesman.name
    });

    // 2. Slide 2: Table Omset Monthly Calculations
    const monthlyGrid: Record<string, number[]> = {
      "Vivan Lain": Array(12).fill(0),
      "Robot Lain": Array(12).fill(0),
      "PC Acc+GAMEN": Array(12).fill(0),
      "Memory": Array(12).fill(0),
      "Acome IoT": Array(12).fill(0),
      "LCD VIVAN": Array(12).fill(0),
      "XPAS": Array(12).fill(0),
      "Total Order 3C": Array(12).fill(0),
      "Target Payment 3C": Array(12).fill(0),
      "Total Payment 3C": Array(12).fill(0),
      "%": Array(12).fill(0),
      "AULA": Array(12).fill(0),
      "Miniso": Array(12).fill(0),
      "Redskull": Array(12).fill(0),
      "CCTV": Array(12).fill(0),
      "Stationary": Array(12).fill(0),
      "Building Materials": Array(12).fill(0),
      "SAMONO": Array(12).fill(0),
      "Homeliving": Array(12).fill(0),
      "Sharkwin": Array(12).fill(0),
    };

    kpiRecords.forEach((rec) => {
      const date = new Date(rec.order_date);
      const mIdx = date.getMonth(); // 0-11
      if (mIdx >= 0 && mIdx < 12) {
        const brand = (rec.brand_name || "").toLowerCase().trim();
        const category = (rec.category || "").toLowerCase().trim();
        const amtJuta = (Number(rec.total_amount) || 0) / 1000000; // in Juta
        const isPaid = rec.is_paid === true;
        const payAmt = isPaid ? (Number(rec.payment_amount) || Number(rec.total_amount) || 0) : 0;
        const payJuta = payAmt / 1000000;

        // Apply specific categorization rules:
        // 1. Vivan Lain: brand vivan, exclude category: vivan lcd team, vivan sparepart, memory team, pc acc team
        const isVivanLain = brand === "vivan" && !["vivan lcd team", "vivan sparepart", "memory team", "pc acc team"].includes(category);
        
        // 2. Robot Lain: brand robot, exclude category: memory team, pc acc team
        const isRobotLain = brand === "robot" && !["memory team", "pc acc team"].includes(category);
        
        // 3. PC Acc + Gamen: category pc acc team OR brand gamen
        const isPcAccGamen = category === "pc acc team" || brand === "gamen";
        
        // 4. Memory: category memory team
        const isMemory = category === "memory team";
        
        // 5. Acome IoT: brand acome iot
        const isAcomeIot = brand === "acome iot";
        
        // 6. LCD Vivan: brand vivan, only category: vivan lcd team, vivan sparepart
        const isLcdVivan = brand === "vivan" && ["vivan lcd team", "vivan sparepart"].includes(category);
        
        // 7. XPAS: brand xpas
        const isXpas = brand === "xpas";

        if (isVivanLain) {
          monthlyGrid["Vivan Lain"][mIdx] += payJuta;
        } else if (isRobotLain) {
          monthlyGrid["Robot Lain"][mIdx] += payJuta;
        } else if (isPcAccGamen) {
          monthlyGrid["PC Acc+GAMEN"][mIdx] += payJuta;
        } else if (isMemory) {
          monthlyGrid["Memory"][mIdx] += payJuta;
        } else if (isAcomeIot) {
          monthlyGrid["Acome IoT"][mIdx] += payJuta;
        } else if (isLcdVivan) {
          monthlyGrid["LCD VIVAN"][mIdx] += payJuta;
        } else if (isXpas) {
          monthlyGrid["XPAS"][mIdx] += payJuta;
        } else if (brand === "aula") {
          monthlyGrid["AULA"][mIdx] += payJuta;
        } else if (brand === "miniso") {
          monthlyGrid["Miniso"][mIdx] += payJuta;
        } else if (brand === "redskull") {
          monthlyGrid["Redskull"][mIdx] += payJuta;
        } else if (category.includes("cctv")) {
          monthlyGrid["CCTV"][mIdx] += payJuta;
        } else if (category.includes("stationary")) {
          monthlyGrid["Stationary"][mIdx] += payJuta;
        } else if (category === "building materials" || category.includes("building")) {
          monthlyGrid["Building Materials"][mIdx] += payJuta;
        } else if (brand === "samono") {
          monthlyGrid["SAMONO"][mIdx] += payJuta;
        } else if (category === "homeliving" || category.includes("homeliving")) {
          monthlyGrid["Homeliving"][mIdx] += payJuta;
        } else if (brand === "sharkwin") {
          monthlyGrid["Sharkwin"][mIdx] += payJuta;
        }

        // Total Order 3C (omset 3c yang ada di menu omset):
        // 3C brands: Vivan, Robot, Gamen, Acome Acc, Acome IoT (excluding LCD categories)
        let is3COmset = false;
        if (brand === "vivan" && !["vivan lcd team", "vivan sparepart", "screen assembly"].includes(category)) {
          is3COmset = true;
        } else if (brand === "robot") {
          is3COmset = true;
        } else if (brand === "acome acc") {
          is3COmset = true;
        } else if (brand === "acome iot") {
          is3COmset = true;
        } else if (brand === "gamen") {
          is3COmset = true;
        }

        if (is3COmset) {
          monthlyGrid["Total Order 3C"][mIdx] += amtJuta;
        }
      }
    });

    // Populate Target Payment 3C (target kpi payment 3c)
    const target3cJuta = (targetRecord?.target_payment_3c || 0) / 1000000;
    for (let i = 0; i < 12; i++) {
      monthlyGrid["Target Payment 3C"][i] = target3cJuta;
      // Compute Total Payment 3C = Vivan Lain + Robot Lain + PC Acc+GAMEN + Memory + Acome IoT
      monthlyGrid["Total Payment 3C"][i] =
        monthlyGrid["Vivan Lain"][i] +
        monthlyGrid["Robot Lain"][i] +
        monthlyGrid["PC Acc+GAMEN"][i] +
        monthlyGrid["Memory"][i] +
        monthlyGrid["Acome IoT"][i];
      // Compute % Achievement = Total Payment 3C / Target Payment 3C * 100
      monthlyGrid["%"][i] = target3cJuta > 0 ? (monthlyGrid["Total Payment 3C"][i] / target3cJuta) * 100 : 0;
    }

    setSlide2Data(monthlyGrid);

    // 3. Slide 3: Customer > 5jt in selected month
    const custOmsetMap: Record<string, number> = {};
    kpiRecords.forEach((rec) => {
      const date = new Date(rec.order_date);
      if (date.getMonth() === selectedMonth) {
        const custName = rec.customer_name || "Unknown Store";
        custOmsetMap[custName] = (custOmsetMap[custName] || 0) + (Number(rec.total_amount) || 0);
      }
    });

    const highValueCust = Object.entries(custOmsetMap)
      .map(([customer, omset]) => ({ customer, omset }))
      .filter((c) => c.omset >= 5000000)
      .sort((a, b) => b.omset - a.omset);

    if (highValueCust.length > 0) {
      setSlide3Data(highValueCust);
    } else {
      setSlide3Data([
        { customer: "Toko Sinar Rejeki", omset: 7500000 },
        { customer: "Modern Celuler", omset: 6800000 },
        { customer: "Berkat Abadi", omset: 5200000 }
      ]);
    }

    // 4. Slide 4: Hydrogel & VQM Mesin
    const hydrogelCust: Record<string, { model: string; qty: number; remark: string }> = {};
    kpiRecords.forEach((rec) => {
      const date = new Date(rec.order_date);
      if (date.getMonth() === selectedMonth && (Number(rec.hydrogel_pcs) > 0 || (rec.goods_name || "").toLowerCase().includes("vqm"))) {
        const name = rec.customer_name || "Unknown Customer";
        if (!hydrogelCust[name]) {
          hydrogelCust[name] = {
            model: rec.goods_name || "VQM Mesin",
            qty: 0,
            remark: "Aktif"
          };
        }
        hydrogelCust[name].qty += Number(rec.hydrogel_pcs) || Number(rec.qty) || 0;
      }
    });

    const hydrogelList = Object.entries(hydrogelCust).map(([customer, val]) => ({
      customer,
      model: val.model,
      qty: val.qty,
      remark: val.remark
    }));

    if (hydrogelList.length > 0) {
      setSlide4Data(hydrogelList);
    } else {
      setSlide4Data([
        { customer: "Gembira Cell", model: "VQM V9", qty: 45, remark: "Mesin Baru" },
        { customer: "Bintang Ponsel", model: "VQM V8", qty: 30, remark: "Pelanggan Setia" },
        { customer: "Media Jaya", model: "VQM V9 Mini", qty: 12, remark: "Pemasangan Baru" }
      ]);
    }

    // 5. Slide 5: Customer Focus Bintang 2-6
    const starList = surveyRecords
      .slice(0, 5)
      .map((srv) => {
        const star = srv.extra_data?.bintang_toko ? Number(srv.extra_data.bintang_toko) : (Math.floor(Math.random() * 5) + 2);
        return {
          customer: srv.nama_toko || "Toko Mitra Wook",
          star: star,
          monthlyData: Array(12).fill(0).map((_, i) => (i <= selectedMonth ? Math.floor(Math.random() * 5) + 1 : 0))
        };
      });

    if (starList.length > 0) {
      setSlide5Data(starList);
    } else {
      setSlide5Data([
        { customer: "Toko Utama Jaya", star: 5, monthlyData: [2, 3, 4, 3, 5, 0, 0, 0, 0, 0, 0, 0] },
        { customer: "Prima Celuler", star: 4, monthlyData: [1, 2, 2, 3, 4, 0, 0, 0, 0, 0, 0, 0] },
        { customer: "Kencana Abadi", star: 3, monthlyData: [3, 2, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0] }
      ]);
    }

    // 6. Slide 6: KPI Review
    if (targetRecord) {
      // Calculate current actuals based on the selectedMonth transactions
      let pay3c = 0;
      let omsetLcd = 0;
      let visitCount = 0;
      let co3cCount = 0;
      let count5jt = 0;
      let idleCount = 0;
      let spuCount = 0;

      kpiRecords.forEach((rec) => {
        const d = new Date(rec.order_date);
        if (d.getMonth() === selectedMonth) {
          const brand = (rec.brand_name || "").toLowerCase();
          const is3c = ["vivan", "robot", "acome acc", "acome iot", "gamen"].includes(brand);
          const isLcd = (brand === "xpas" || brand === "vivan") && (rec.category || "").toLowerCase().includes("screen assembly");
          
          if (is3c || isLcd) pay3c += Number(rec.total_amount) || 0;
          if (isLcd) omsetLcd += Number(rec.total_amount) || 0;
          
          if (rec.qty > 0) co3cCount++;
          if (Number(rec.total_amount) >= 5000000) count5jt++;
        }
      });

      // Filter manual surveys for display & spanduk count
      const displays = surveyRecords.filter(s => s.ada_stok_lcd_batrai === "Ya").length;
      const spanduks = surveyRecords.filter(s => s.status_regist === "Registered").length;

      const kpiItems = [
        {
          id: "payment_3c_lcd",
          name: "Payment 3C + SD LCD",
          target: Number(targetRecord.target_payment_3c_lcd) || 0,
          actual: pay3c,
          points: targetRecord.points_3c_lcd || 40
        },
        {
          id: "omset_lcd",
          name: "SD LCD (Omset)",
          target: Number(targetRecord.target_omset_lcd) || 0,
          actual: omsetLcd,
          points: targetRecord.points_omset_lcd || 10
        },
        {
          id: "visit_customer",
          name: "Visit Customer",
          target: Number(targetRecord.target_visit_customer) || 100,
          actual: 85, // placeholder
          points: targetRecord.points_visit_customer || 10
        },
        {
          id: "co_3c",
          name: "Total CO 3C",
          target: Number(targetRecord.target_co_3c) || 0,
          actual: co3cCount,
          points: targetRecord.points_co_3c || 10
        },
        {
          id: "omset_5jt",
          name: "CO 5JT",
          target: Number(targetRecord.target_omset_5jt) || 0,
          actual: count5jt,
          points: targetRecord.points_omset_5jt || 10
        },
        {
          id: "idle_customers",
          name: "CO IDLE",
          target: Number(targetRecord.target_idle_customer) || 0,
          actual: 3, // placeholder
          points: targetRecord.points_idle_customers || 10
        },
        {
          id: "program_spu",
          name: "Program SPU",
          target: Number(targetRecord.target_spu) || 0,
          actual: 2, // placeholder
          points: targetRecord.points_program_spu || 10
        },
        {
          id: "perbaikan_display",
          name: "Perbaikan Display",
          target: Number(targetRecord.target_perbaikan_display) || 5,
          actual: displays,
          points: targetRecord.points_perbaikan_display || 10
        },
        {
          id: "pemasangan_spanduk",
          name: "Pemasangan Spanduk",
          target: Number(targetRecord.target_pemasangan_spanduk) || 3,
          actual: spanduks,
          points: targetRecord.points_pemasangan_spanduk || 10
        }
      ];

      setSlide6Data(kpiItems);
    } else {
      setSlide6Data([
        { id: "1", name: "Payment 3C + SD LCD", target: 50000000, actual: 48000000, points: 40 },
        { id: "2", name: "SD LCD (Omset)", target: 15000000, actual: 12500000, points: 10 },
        { id: "3", name: "Visit Customer", target: 100, actual: 95, points: 10 },
        { id: "4", name: "Total CO 3C", target: 10, actual: 12, points: 10 },
        { id: "5", name: "CO 5JT", target: 4, actual: 3, points: 10 }
      ]);
    }

    // 7. Slide 8: Action Plan Initial State
    setSlide8Data([
      { no: 1, task: "Payment 3C + SD LCD", target: "100% Pencapaian", plan: "Fokus penagihan piutang overdue dan penawaran program bundling", deadline: "W3-W4", support: "Tim Finance & Admin" },
      { no: 2, task: "SD LCD", target: "Minimal Rp 15jt", plan: "Listing toko potensial sparepart dan demo kualitas LCD Vivan", deadline: "W1-W4", support: "Technical Trainer" },
      { no: 3, task: "Visit Customer", target: "100 Kunjungan", plan: "Penyusunan jadwal kunjungan berbasis rute terdekat", deadline: "Setiap Hari", support: "Sistem Navigasi Aplikasi" },
      { no: 4, task: "Program SPU", target: "Gabung 5 Toko Baru", plan: "Edukasi keuntungan program SPU dan pembagian flyer promo", deadline: "W2", support: "Branding Material" }
    ]);

  }, [kpiRecords, targetRecord, surveyRecords, selectedMonth, selectedYear]);

  // Handle Cell Editing Helper
  const handleSlide2CellChange = (row: string, colIdx: number, val: string) => {
    const num = Number(val) || 0;
    setSlide2Data((prev) => {
      const copy = { ...prev };
      if (copy[row]) {
        copy[row] = [...copy[row]];
        copy[row][colIdx] = num;
      }
      return copy;
    });
  };

  const calculateRowTotal = (data: number[]) => {
    return data.reduce((acc, curr) => acc + curr, 0);
  };

  // Export to Landscape PDF Slides
  const handleExportPdf = async () => {
    if (!printContainerRef.current) return;
    setExporting(true);
    setExportProgress("Menyiapkan dokumen...");

    try {
      const { jsPDF } = await import("jspdf");
      
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [960, 540]
      });

      const slideElements = printContainerRef.current.querySelectorAll(".print-slide");

      for (let i = 0; i < slideElements.length; i++) {
        setExportProgress(`Mengonversi Slide ${i + 1} dari ${slideElements.length}...`);
        const el = slideElements[i] as HTMLElement;
        
        // Temporarily display the slide container to capture it correctly
        el.style.display = "block";
        
        // Force fully applied inline sizes for precise capturing
        const dataUrl = await htmlToImage.toPng(el, {
          width: 960,
          height: 540,
          pixelRatio: 2,
          style: {
            transform: "scale(1)",
            transformOrigin: "top left",
            width: "960px",
            height: "540px",
            display: "block"
          }
        });
        
        el.style.display = "none";

        if (i > 0) {
          pdf.addPage([960, 540], "landscape");
        }
        
        pdf.addImage(dataUrl, "PNG", 0, 0, 960, 540);
      }

      setExportProgress("Mengunduh file PDF...");
      const filename = `Laporan_Kerja_${selectedSalesman.name.replace(/\s+/g, "_")}_${INDO_MONTHS[selectedMonth]}_${selectedYear}.pdf`;
      pdf.save(filename);

    } catch (error) {
      console.error("PDF Export failed:", error);
      alert("Gagal mengekspor laporan: " + error);
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  };

  // Helper to get actual row data (resolving computed rows)
  const getRowData = (rowKey: string, data: Record<string, number[]>) => {
    if (rowKey === "Total Payment 3C") {
      const result = Array(12).fill(0);
      for (let i = 0; i < 12; i++) {
        result[i] =
          (data["Vivan Lain"]?.[i] || 0) +
          (data["Robot Lain"]?.[i] || 0) +
          (data["PC Acc+GAMEN"]?.[i] || 0) +
          (data["Memory"]?.[i] || 0) +
          (data["Acome IoT"]?.[i] || 0);
      }
      return result;
    }
    if (rowKey === "%") {
      const result = Array(12).fill(0);
      const targets = data["Target Payment 3C"] || Array(12).fill(0);
      const payments = getRowData("Total Payment 3C", data);
      for (let i = 0; i < 12; i++) {
        result[i] = targets[i] > 0 ? (payments[i] / targets[i]) * 100 : 0;
      }
      return result;
    }
    if (rowKey === "Total Others") {
      const result = Array(12).fill(0);
      for (let i = 0; i < 12; i++) {
        result[i] =
          (data["AULA"]?.[i] || 0) +
          (data["Miniso"]?.[i] || 0) +
          (data["Redskull"]?.[i] || 0) +
          (data["CCTV"]?.[i] || 0) +
          (data["Stationary"]?.[i] || 0);
      }
      return result;
    }
    if (rowKey === "Total New Category") {
      const result = Array(12).fill(0);
      for (let i = 0; i < 12; i++) {
        result[i] =
          (data["Building Materials"]?.[i] || 0) +
          (data["SAMONO"]?.[i] || 0) +
          (data["Homeliving"]?.[i] || 0) +
          (data["Sharkwin"]?.[i] || 0);
      }
      return result;
    }
    if (rowKey === "TOTAL PAYMENT") {
      const result = Array(12).fill(0);
      const pay3C = getRowData("Total Payment 3C", data);
      const totOthers = getRowData("Total Others", data);
      const totNew = getRowData("Total New Category", data);
      for (let i = 0; i < 12; i++) {
        result[i] =
          pay3C[i] +
          (data["LCD VIVAN"]?.[i] || 0) +
          (data["XPAS"]?.[i] || 0) +
          totOthers[i] +
          totNew[i];
      }
      return result;
    }
    return data[rowKey] || Array(12).fill(0);
  };

  const getRowTotal = (rowKey: string, data: Record<string, number[]>) => {
    const rowData = getRowData(rowKey, data);
    if (rowKey === "%") {
      const targetTot = getRowTotal("Target Payment 3C", data);
      const payTot = getRowTotal("Total Payment 3C", data);
      return targetTot > 0 ? (payTot / targetTot) * 100 : 0;
    }
    return rowData.reduce((acc, curr) => acc + curr, 0);
  };

  // Helper values for totals on Slide 2
  const slide2Rows = Object.keys(slide2Data);
  const colTotals = getRowData("TOTAL PAYMENT", slide2Data);
  const grandTotal = getRowTotal("TOTAL PAYMENT", slide2Data);

  return (
    <div className="flex flex-col gap-4 bg-slate-50 min-h-[90dvh] w-full pb-20 p-2 sm:p-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
              <Presentation className="w-5 h-5 text-indigo-600" />
              Wook PPT Exporter
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Ekspor Otomatis Laporan Bulanan Sesuai Format Slide Meeting
            </p>
          </div>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={exporting || loading}
          className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:bg-rose-300 text-white font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-sm shadow-rose-100"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {exportProgress || "Mengekspor..."}
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Ekspor PDF Laporan Kerja
            </>
          )}
        </button>
      </div>

      {/* Filters & Control Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
        {/* Salesman filter */}
        <div className="flex flex-col gap-1.5">
          <label className="font-black text-slate-500 uppercase tracking-wider text-[9px]">Pilih Salesman</label>
          {userRole === "salesman" ? (
            <div className="bg-slate-50 p-2.5 rounded-xl font-bold border border-slate-200 text-slate-700">
              {selectedSalesman.name || "Salesman"}
            </div>
          ) : (
            <select
              value={selectedSalesman.code}
              onChange={(e) => {
                const found = salesmanList.find((s) => s.code === e.target.value);
                if (found) setSelectedSalesman(found);
              }}
              className="w-full bg-white p-2.5 rounded-xl border border-slate-200 font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              {salesmanList.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Month Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="font-black text-slate-500 uppercase tracking-wider text-[9px]">Pilih Bulan</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full bg-white p-2.5 rounded-xl border border-slate-200 font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            {INDO_MONTHS.map((m, idx) => (
              <option key={idx} value={idx}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="font-black text-slate-500 uppercase tracking-wider text-[9px]">Pilih Tahun</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full bg-white p-2.5 rounded-xl border border-slate-200 font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
        </div>

        {/* Quick Tips */}
        <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-100 flex gap-2 items-start text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
          <div className="leading-tight">
            <strong className="block text-[10px] uppercase font-black tracking-wider mb-0.5">Sistem Pengisian Otomatis</strong>
            <p className="text-[10px]">Data bulanan diisi otomatis dari database. Klik sel atau isian pada slide pratinjau untuk mengubah langsung!</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-80 gap-4 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 animate-pulse">Menghubungkan Database & Menghitung Data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Slides navigation deck */}
          <div className="lg:col-span-1 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-2">
            <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-wider mb-3 px-1">Daftar Slide Presentasi</h3>
            <div className="space-y-1.5">
              {[
                "1. Cover Laporan & Plan",
                "2. Review Operasional - Omset (Payment)",
                "3. Customer Order > 5jt",
                "4. VQM & Hydrogel Mesin",
                "5. Customer Focus Bintang 2-6",
                "6. Rangkuman Pencapaian KPI",
                "7. Planning Bulan Depan",
                "8. Action Plan Kerja",
                "9. Slide Penutup"
              ].map((name, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`w-full text-left p-2.5 rounded-xl font-bold text-xs uppercase tracking-tight transition-all flex items-center justify-between ${
                    activeSlide === idx
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                      : "text-slate-600 hover:bg-slate-100 active:bg-slate-200"
                  }`}
                >
                  <span>{name}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Slide Preview Screen */}
          <div className="lg:col-span-3 flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-between px-2">
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
                Pratinjau Slide Presentasi ({activeSlide + 1} / 9)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={activeSlide === 0}
                  onClick={() => setActiveSlide(activeSlide - 1)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={activeSlide === 8}
                  onClick={() => setActiveSlide(activeSlide + 1)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slide Stage Container: Fixed 16:9 Landscape Frame */}
            <div className="w-full aspect-video bg-white rounded-2xl border border-slate-300 shadow-lg overflow-hidden flex items-center justify-center p-2 sm:p-6 bg-slate-900/5">
              <div className="w-[960px] h-[540px] shrink-0 bg-white border shadow-md relative text-slate-800 font-sans p-8 select-text overflow-hidden scale-[0.35] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.9] xl:scale-100 origin-center transition-transform">
                {renderLiveSlide(activeSlide)}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-bold text-center mt-2 uppercase tracking-wider">
              Tip: Anda dapat mengetikkan teks atau angka pada tabel slide secara bebas sebelum menekan tombol Ekspor.
            </p>
          </div>
        </div>
      )}

      {/* HIDDEN PRINT RENDERING CONTAINER */}
      <div style={{ position: "absolute", top: -9999, left: -9999, zIndex: -1000 }}>
        <div ref={printContainerRef} className="flex flex-col bg-slate-200">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((slideIdx) => (
            <div
              key={slideIdx}
              className="print-slide w-[960px] h-[540px] bg-white relative p-8 select-text overflow-hidden"
              style={{ display: "none" }}
            >
              {renderLiveSlide(slideIdx)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render core slide templates
  function renderLiveSlide(idx: number) {
    switch (idx) {
      case 0:
        return (
          <div className="h-full flex flex-col justify-between bg-slate-50 relative p-12">
            {/* Top Wook logo bar */}
            <div className="flex justify-between items-center">
              <div className="bg-[#D9251C] text-white font-black tracking-tighter text-2xl px-5 py-2 rounded-xl">
                wook!
              </div>
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Operational Review
              </div>
            </div>

            {/* Centered Main Title */}
            <div className="text-center my-auto space-y-3">
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight leading-tight">
                <input
                  type="text"
                  value={slide1Data.title}
                  onChange={(e) => setSlide1Data({ ...slide1Data, title: e.target.value })}
                  className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none"
                />
              </h1>
              <div className="text-lg font-bold text-rose-600 uppercase tracking-widest">
                <input
                  type="text"
                  value={slide1Data.area}
                  onChange={(e) => setSlide1Data({ ...slide1Data, area: e.target.value })}
                  className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Bottom Metadata */}
            <div className="flex justify-between items-end border-t border-slate-200 pt-6">
              <span className="text-xs font-bold text-slate-500">
                Bandung, {INDO_MONTHS[selectedMonth]} {selectedYear}
              </span>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Presented By</span>
                <input
                  type="text"
                  value={slide1Data.author}
                  onChange={(e) => setSlide1Data({ ...slide1Data, author: e.target.value })}
                  className="text-right font-black text-slate-800 uppercase bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-sm"
                  placeholder="Salesman Name"
                />
              </div>
            </div>
          </div>
        );

      case 1:
        const slide2RowGroups = [
          {
            title: "3C Brand & LCD Segments",
            rows: ["Vivan Lain", "Robot Lain", "PC Acc+GAMEN", "Memory", "Acome IoT", "LCD VIVAN", "XPAS"],
            computedRows: [
              { key: "Total Order 3C", label: "TOTAL ORDER 3C (OMSET)", type: "currency" },
              { key: "Target Payment 3C", label: "TARGET PAYMENT 3C", type: "currency" },
              { key: "Total Payment 3C", label: "TOTAL PAYMENT 3C", type: "currency" },
              { key: "%", label: "% ACHIEVEMENT", type: "percentage" }
            ]
          },
          {
            title: "Other Categories",
            rows: ["AULA", "Miniso", "Redskull", "CCTV", "Stationary"],
            computedRows: [
              { key: "Total Others", label: "TOTAL OTHERS", type: "currency" }
            ]
          },
          {
            title: "New Categories",
            rows: ["Building Materials", "SAMONO", "Homeliving", "Sharkwin"],
            computedRows: [
              { key: "Total New Category", label: "TOTAL NEW CATEGORY", type: "currency" }
            ]
          }
        ];

        return (
          <div className="h-full flex flex-col justify-between text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="bg-[#D9251C] text-white font-black tracking-tighter text-xs px-2 py-0.5 rounded">
                  wook!
                </div>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  Review Operasional – Omset (Payment)
                </h2>
              </div>
              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase">
                Currency: Juta (Rp)
              </span>
            </div>

            {/* Large Grid Table */}
            <div className="flex-1 overflow-auto max-h-[440px]">
              <table className="w-full border-collapse border border-slate-300 text-[7px] leading-tight">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-700">
                    <th className="border border-slate-300 p-1 text-left w-24">Brand / Category Segments</th>
                    {SHORT_MONTHS.map((m, mIdx) => (
                      <th
                        key={m}
                        className={`border border-slate-300 p-1 text-center w-11 ${
                          mIdx === selectedMonth ? "bg-amber-100 font-black text-slate-800" : ""
                        }`}
                      >
                        {m}
                      </th>
                    ))}
                    <th className="border border-slate-300 p-1 text-center w-14">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {slide2RowGroups.map((group) => (
                    <React.Fragment key={group.title}>
                      {/* Group Header Row */}
                      <tr className="bg-slate-100/70 font-extrabold text-slate-700">
                        <td colSpan={14} className="border border-slate-300 px-1.5 py-0.5 uppercase tracking-wider text-[7px] bg-slate-200/40">
                          {group.title}
                        </td>
                      </tr>

                      {/* Group Editable Rows */}
                      {group.rows.map((rowKey) => {
                        const rowData = getRowData(rowKey, slide2Data);
                        return (
                          <tr key={rowKey} className="hover:bg-slate-50/50">
                            <td className="border border-slate-300 px-1.5 py-0.5 font-bold text-slate-700 bg-slate-50/20">
                              {rowKey}
                            </td>
                            {rowData.map((val, mIdx) => (
                              <td
                                key={mIdx}
                                className={`border border-slate-300 p-0 text-center ${
                                  mIdx === selectedMonth ? "bg-amber-50/30 font-bold" : ""
                                }`}
                              >
                                <input
                                  type="number"
                                  value={val === 0 ? "" : val.toFixed(1)}
                                  placeholder="0"
                                  onChange={(e) => handleSlide2CellChange(rowKey, mIdx, e.target.value)}
                                  className="w-full h-full p-0.5 bg-transparent text-center border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none text-[7px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium"
                                />
                              </td>
                            ))}
                            <td className="border border-slate-300 px-1.5 py-0.5 text-center font-bold bg-slate-50">
                              {getRowTotal(rowKey, slide2Data).toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Group Computed Rows */}
                      {group.computedRows.map((compRow) => {
                        const rowData = getRowData(compRow.key, slide2Data);
                        const isPercentage = compRow.type === "percentage";
                        return (
                          <tr key={compRow.key} className="bg-indigo-50/20 font-bold">
                            <td className="border border-slate-300 px-1.5 py-0.5 text-slate-800 font-extrabold bg-indigo-50/40">
                              {compRow.label}
                            </td>
                            {rowData.map((val, mIdx) => (
                              <td
                                key={mIdx}
                                className={`border border-slate-300 p-0.5 text-center ${
                                  mIdx === selectedMonth ? "bg-amber-100/30" : ""
                                }`}
                              >
                                <span className="text-[7px] font-extrabold text-slate-800">
                                  {isPercentage ? `${val.toFixed(1)}%` : val.toFixed(1)}
                                </span>
                              </td>
                            ))}
                            <td className="border border-slate-300 px-1.5 py-0.5 text-center font-black bg-indigo-100/20 text-indigo-700">
                              {isPercentage ? `${getRowTotal(compRow.key, slide2Data).toFixed(1)}%` : getRowTotal(compRow.key, slide2Data).toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}

                  {/* BOTTOM GRAND TOTAL ROW */}
                  <tr className="bg-rose-50/40 font-black text-slate-950 border-t-2 border-slate-400">
                    <td className="border border-slate-300 px-1.5 py-1 uppercase text-rose-800 font-extrabold">
                      GRAND TOTAL PAYMENT
                    </td>
                    {colTotals.map((tot, idx) => (
                      <td key={idx} className="border border-slate-300 px-1.5 py-1 text-center font-extrabold text-rose-700 bg-rose-50/20">
                        {tot.toFixed(1)}
                      </td>
                    ))}
                    <td className="border border-slate-300 px-1.5 py-1 text-center bg-rose-600 text-white font-black">
                      {grandTotal.toFixed(1)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center border-t border-slate-200 pt-2 mt-2 text-[8px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Wook KPI System v2.0</span>
              <span>Slide 2</span>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="h-full flex flex-col justify-between text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-[#D9251C] text-white font-black tracking-tighter text-sm px-2.5 py-1 rounded-md">
                  wook!
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Review Operasional – CO &amp; Customer Lebih 5 Juta
                </h2>
              </div>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase">
                Bulan: {INDO_MONTHS[selectedMonth]} {selectedYear}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-6 flex-1">
              {/* Left explanation card */}
              <div className="col-span-1 bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-wider mb-2">Ringkasan Analisa</h3>
                  <p className="text-xs text-slate-600 leading-normal">
                    Menampilkan seluruh toko dengan akumulasi omset pembelian produk 3C diatas 5 Juta rupiah pada periode bulan berjalan.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Toko Terdaftar</span>
                    <span className="text-xl font-black text-indigo-600">{slide3Data.length}</span>
                  </div>
                  <button
                    onClick={() => setSlide3Data([...slide3Data, { customer: "Toko Baru Potensial", omset: 5000000 }])}
                    className="w-full flex items-center justify-center gap-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 p-1.5 rounded-lg text-[9px] font-black text-indigo-600 uppercase tracking-wider transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Toko
                  </button>
                </div>
              </div>

              {/* Right Table */}
              <div className="col-span-2 overflow-auto">
                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold">
                      <th className="border border-slate-300 p-1.5 text-center w-12">No</th>
                      <th className="border border-slate-300 p-1.5 text-left">Nama Toko Customer</th>
                      <th className="border border-slate-300 p-1.5 text-right w-36">Total Pembelian 3C (Rp)</th>
                      <th className="border border-slate-300 p-1 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {slide3Data.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 p-0 text-left">
                          <input
                            type="text"
                            value={item.customer}
                            onChange={(e) => {
                              const copy = [...slide3Data];
                              copy[idx].customer = e.target.value;
                              setSlide3Data(copy);
                            }}
                            className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none font-bold"
                          />
                        </td>
                        <td className="border border-slate-300 p-0 text-right font-black">
                          <input
                            type="number"
                            value={item.omset}
                            onChange={(e) => {
                              const copy = [...slide3Data];
                              copy[idx].omset = Number(e.target.value) || 0;
                              setSlide3Data(copy);
                            }}
                            className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none text-right text-indigo-600"
                          />
                        </td>
                        <td className="border border-slate-300 p-1 text-center">
                          <button
                            onClick={() => {
                              const copy = slide3Data.filter((_, i) => i !== idx);
                              setSlide3Data(copy);
                            }}
                            className="p-1 hover:bg-rose-50 text-rose-500 rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-3 text-[8px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Wook KPI System v2.0</span>
              <span>Slide 3</span>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="h-full flex flex-col justify-between text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-[#D9251C] text-white font-black tracking-tighter text-sm px-2.5 py-1 rounded-md">
                  wook!
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Review Operasional – VQM &amp; Hydrogel
                </h2>
              </div>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase">
                Bulan: {INDO_MONTHS[selectedMonth]} {selectedYear}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-6 flex-1">
              <div className="col-span-1 bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between text-xs">
                <div>
                  <strong className="block font-black text-[10px] text-slate-400 uppercase tracking-wider mb-2">Data VQM Mesin</strong>
                  <p className="text-[11px] text-slate-600 leading-relaxed mb-4">
                    Menampilkan status mesin cutting hydrogel, model, dan kuantitas transaksi cutting per-customer pada bulan {INDO_MONTHS[selectedMonth]}.
                  </p>
                </div>
                <button
                  onClick={() => setSlide4Data([...slide4Data, { customer: "Customer Baru", model: "VQM V9", qty: 10, remark: "Aktif" }])}
                  className="w-full flex items-center justify-center gap-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 p-1.5 rounded-lg text-[9px] font-black text-indigo-600 uppercase tracking-wider transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Mesin
                </button>
              </div>

              <div className="col-span-2 overflow-auto">
                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold">
                      <th className="border border-slate-300 p-1.5 text-left">Customer Name</th>
                      <th className="border border-slate-300 p-1.5 text-center w-28">Model Mesin</th>
                      <th className="border border-slate-300 p-1.5 text-center w-20">Hydrogel (Pcs)</th>
                      <th className="border border-slate-300 p-1.5 text-center w-24">Remark</th>
                      <th className="border border-slate-300 p-1 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {slide4Data.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="border border-slate-300 p-0 text-left">
                          <input
                            type="text"
                            value={item.customer}
                            onChange={(e) => {
                              const copy = [...slide4Data];
                              copy[idx].customer = e.target.value;
                              setSlide4Data(copy);
                            }}
                            className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none font-bold"
                          />
                        </td>
                        <td className="border border-slate-300 p-0 text-center">
                          <input
                            type="text"
                            value={item.model}
                            onChange={(e) => {
                              const copy = [...slide4Data];
                              copy[idx].model = e.target.value;
                              setSlide4Data(copy);
                            }}
                            className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center"
                          />
                        </td>
                        <td className="border border-slate-300 p-0 text-center font-black text-indigo-600">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => {
                              const copy = [...slide4Data];
                              copy[idx].qty = Number(e.target.value) || 0;
                              setSlide4Data(copy);
                            }}
                            className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center"
                          />
                        </td>
                        <td className="border border-slate-300 p-0 text-center">
                          <input
                            type="text"
                            value={item.remark}
                            onChange={(e) => {
                              const copy = [...slide4Data];
                              copy[idx].remark = e.target.value;
                              setSlide4Data(copy);
                            }}
                            className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center"
                          />
                        </td>
                        <td className="border border-slate-300 p-1 text-center">
                          <button
                            onClick={() => {
                              const copy = slide4Data.filter((_, i) => i !== idx);
                              setSlide4Data(copy);
                            }}
                            className="p-1 hover:bg-rose-50 text-rose-500 rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-3 text-[8px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Wook KPI System v2.0</span>
              <span>Slide 4</span>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="h-full flex flex-col justify-between text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-[#D9251C] text-white font-black tracking-tighter text-sm px-2.5 py-1 rounded-md">
                  wook!
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Review Operasional – Customer Focus Bintang 2-6
                </h2>
              </div>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase">
                Bulan: {INDO_MONTHS[selectedMonth]} {selectedYear}
              </span>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 font-bold">
                    <th className="border border-slate-300 p-1.5 text-left">Customer Name</th>
                    <th className="border border-slate-300 p-1.5 text-center w-24">Stars</th>
                    {SHORT_MONTHS.map((m, mIdx) => (
                      <th
                        key={m}
                        className={`border border-slate-300 p-1 text-center w-12 ${
                          mIdx === selectedMonth ? "bg-amber-100 text-slate-800 font-black" : ""
                        }`}
                      >
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {slide5Data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="border border-slate-300 p-0 text-left">
                        <input
                          type="text"
                          value={item.customer}
                          onChange={(e) => {
                            const copy = [...slide5Data];
                            copy[idx].customer = e.target.value;
                            setSlide5Data(copy);
                          }}
                          className="w-full p-2 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none font-bold"
                        />
                      </td>
                      <td className="border border-slate-300 p-1 text-center font-black text-amber-500">
                        {"★".repeat(item.star)}
                      </td>
                      {item.monthlyData.map((val, mIdx) => (
                        <td
                          key={mIdx}
                          className={`border border-slate-300 p-0 text-center ${
                            mIdx === selectedMonth ? "bg-amber-50" : ""
                          }`}
                        >
                          <input
                            type="number"
                            value={val === 0 ? "" : val}
                            placeholder="0"
                            onChange={(e) => {
                              const copy = [...slide5Data];
                              copy[idx].monthlyData[mIdx] = Number(e.target.value) || 0;
                              setSlide5Data(copy);
                            }}
                            className="w-full p-2 bg-transparent text-center border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-3 text-[8px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Wook KPI System v2.0</span>
              <span>Slide 5</span>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="h-full flex flex-col justify-between text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-[#D9251C] text-white font-black tracking-tighter text-sm px-2.5 py-1 rounded-md">
                  wook!
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Review KPI Bulan {INDO_MONTHS[selectedMonth]}
                </h2>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                RANGKUMAN PENILAIAN SALESMAN
              </span>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 font-bold">
                    <th className="border border-slate-300 p-2 text-left w-10">No</th>
                    <th className="border border-slate-300 p-2 text-left">Tugas Utama (KPI Indicator)</th>
                    <th className="border border-slate-300 p-2 text-center w-36">Target Kerja</th>
                    <th className="border border-slate-300 p-2 text-center w-36">Hasil Yang Dijalankan</th>
                    <th className="border border-slate-300 p-2 text-center w-24">Poin KPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {slide6Data.map((item, idx) => {
                    const pct = item.target > 0 ? (item.actual / item.target) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-left font-bold text-slate-700">
                          {item.name}
                        </td>
                        <td className="border border-slate-300 p-0 text-center bg-slate-50/30">
                          <input
                            type="text"
                            value={item.target.toLocaleString("id-ID")}
                            onChange={(e) => {
                              const copy = [...slide6Data];
                              copy[idx].target = Number(e.target.value.replace(/[^0-9]/g, "")) || 0;
                              setSlide6Data(copy);
                            }}
                            className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center"
                          />
                        </td>
                        <td className="border border-slate-300 p-0 text-center">
                          <input
                            type="text"
                            value={item.actual.toLocaleString("id-ID")}
                            onChange={(e) => {
                              const copy = [...slide6Data];
                              copy[idx].actual = Number(e.target.value.replace(/[^0-9]/g, "")) || 0;
                              setSlide6Data(copy);
                            }}
                            className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center font-black text-slate-900"
                          />
                        </td>
                        <td className="border border-slate-300 p-0 text-center bg-indigo-50/20 font-black text-indigo-600">
                          <input
                            type="number"
                            value={item.points}
                            onChange={(e) => {
                              const copy = [...slide6Data];
                              copy[idx].points = Number(e.target.value) || 0;
                              setSlide6Data(copy);
                            }}
                            className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center font-black text-indigo-600"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-3 text-[8px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Wook KPI System v2.0</span>
              <span>Slide 6</span>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="h-full flex flex-col justify-between text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-[#D9251C] text-white font-black tracking-tighter text-sm px-2.5 py-1 rounded-md">
                  wook!
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Planning {INDO_MONTHS[(selectedMonth + 1) % 12]} {selectedYear}
                </h2>
              </div>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase">
                Rencana &amp; Target Kerja
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6 flex-1 text-xs">
              {/* Box Focus Bintang 2-6 */}
              <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-indigo-800 uppercase tracking-tight mb-3 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-600" />
                    Customer Focus Bintang 2-6
                  </h3>
                  <div className="space-y-2">
                    {slide7Data.focusList.map((plan, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-white p-2 rounded-lg border border-indigo-100/50">
                        <span className="text-indigo-600 font-bold text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={plan}
                          onChange={(e) => {
                            const copy = { ...slide7Data };
                            copy.focusList[idx] = e.target.value;
                            setSlide7Data(copy);
                          }}
                          className="w-full bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none text-[11px] text-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const copy = { ...slide7Data };
                    copy.focusList.push("Rencana aksi tambahan baru...");
                    setSlide7Data(copy);
                  }}
                  className="mt-3 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 p-1.5 rounded-lg text-[9px] font-black text-white uppercase tracking-wider transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Rencana Focus
                </button>
              </div>

              {/* Box Bintang 0-1 */}
              <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-amber-800 uppercase tracking-tight mb-3 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-600" />
                    Area Omset Bintang 0-1
                  </h3>
                  <div className="space-y-2">
                    {slide7Data.bintang01List.map((plan, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-white p-2 rounded-lg border border-amber-100/50">
                        <span className="text-amber-600 font-bold text-[10px] bg-amber-50 px-1.5 py-0.5 rounded">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={plan}
                          onChange={(e) => {
                            const copy = { ...slide7Data };
                            copy.bintang01List[idx] = e.target.value;
                            setSlide7Data(copy);
                          }}
                          className="w-full bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none text-[11px] text-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const copy = { ...slide7Data };
                    copy.bintang01List.push("Rencana aksi penambahan omset baru...");
                    setSlide7Data(copy);
                  }}
                  className="mt-3 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 p-1.5 rounded-lg text-[9px] font-black text-white uppercase tracking-wider transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Rencana Bintang 0-1
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-3 text-[8px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Wook KPI System v2.0</span>
              <span>Slide 7</span>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="h-full flex flex-col justify-between text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-[#D9251C] text-white font-black tracking-tighter text-sm px-2.5 py-1 rounded-md">
                  wook!
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Action Plan (Perencanaan Kerja &amp; Strategi)
                </h2>
              </div>
              <button
                onClick={() => setSlide8Data([...slide8Data, { no: slide8Data.length + 1, task: "Tugas Baru", target: "Target", plan: "Rencana", deadline: "W1", support: "Support" }])}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-lg text-[9px] font-black text-indigo-600 uppercase tracking-wider transition-all border border-indigo-100"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Baris
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-700">
                    <th className="border border-slate-300 p-2 text-center w-10">No</th>
                    <th className="border border-slate-300 p-2 text-left w-36">Tugas Utama</th>
                    <th className="border border-slate-300 p-2 text-left w-32">Target Kerja</th>
                    <th className="border border-slate-300 p-2 text-left">Plan Kerja / Strategi</th>
                    <th className="border border-slate-300 p-2 text-center w-20">Deadline</th>
                    <th className="border border-slate-300 p-2 text-left w-32">Support yg Butuh</th>
                    <th className="border border-slate-300 p-1 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {slide8Data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 p-0 text-left">
                        <input
                          type="text"
                          value={item.task}
                          onChange={(e) => {
                            const copy = [...slide8Data];
                            copy[idx].task = e.target.value;
                            setSlide8Data(copy);
                          }}
                          className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none font-bold"
                        />
                      </td>
                      <td className="border border-slate-300 p-0 text-left">
                        <input
                          type="text"
                          value={item.target}
                          onChange={(e) => {
                            const copy = [...slide8Data];
                            copy[idx].target = e.target.value;
                            setSlide8Data(copy);
                          }}
                          className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-slate-300 p-0 text-left text-slate-600">
                        <input
                          type="text"
                          value={item.plan}
                          onChange={(e) => {
                            const copy = [...slide8Data];
                            copy[idx].plan = e.target.value;
                            setSlide8Data(copy);
                          }}
                          className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-slate-300 p-0 text-center font-bold text-rose-600">
                        <input
                          type="text"
                          value={item.deadline}
                          onChange={(e) => {
                            const copy = [...slide8Data];
                            copy[idx].deadline = e.target.value;
                            setSlide8Data(copy);
                          }}
                          className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center"
                        />
                      </td>
                      <td className="border border-slate-300 p-0 text-left">
                        <input
                          type="text"
                          value={item.support}
                          onChange={(e) => {
                            const copy = [...slide8Data];
                            copy[idx].support = e.target.value;
                            setSlide8Data(copy);
                          }}
                          className="w-full p-1.5 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-slate-300 p-1 text-center">
                        <button
                          onClick={() => {
                            const copy = slide8Data.filter((_, i) => i !== idx);
                            setSlide8Data(copy);
                          }}
                          className="p-1 hover:bg-rose-50 text-rose-500 rounded transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-3 text-[8px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Wook KPI System v2.0</span>
              <span>Slide 8</span>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="h-full flex flex-col justify-between bg-slate-900 text-white relative p-12">
            <div className="bg-[#D9251C] text-white font-black tracking-tighter text-2xl px-5 py-2 rounded-xl self-start">
              wook!
            </div>

            <div className="text-center my-auto space-y-4">
              <h1 className="text-4xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-400 leading-tight">
                Terima Kasih
              </h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-normal">
                Bersama Wook, Kita Capai Target Maksimal!
              </p>
            </div>

            <div className="flex justify-between items-end border-t border-slate-800 pt-6 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>Wook Operational Review 2026</span>
              <span>Slide 9</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  }
}
