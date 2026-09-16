import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { batchRepository } from "@/lib/db";
import type { ManagedProductBatch } from "@/lib/db/contracts";

interface MonitorState {
  lastCheckedAt: string;
  knownBatchIds: string[];
  knownEventIds: string[];
  confirmedEventIds: string[];
  solanaAnchoredEventIds: string[];
  documentIds: string[];
}

const STATE_FILE = join(process.cwd(), ".data", "monitor-state.json");
const PORT = process.env.PORT || "7314";
const BASE_URL = `http://localhost:${PORT}`;

async function checkWebHealth(): Promise<{ ok: boolean; status: number | string; latencyMs: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/`, { method: "GET" });
    return {
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      ok: false,
      status: error instanceof Error ? error.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

function loadPreviousState(): MonitorState | null {
  try {
    if (existsSync(STATE_FILE)) {
      const raw = readFileSync(STATE_FILE, "utf8");
      return JSON.parse(raw) as MonitorState;
    }
  } catch {
    // Ignore parse error
  }
  return null;
}

function saveCurrentState(state: MonitorState): void {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.error("Lỗi khi lưu monitor-state.json:", err);
  }
}

export async function runMonitor(isQuiet = false) {
  const now = new Date().toISOString();
  const timeStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const health = await checkWebHealth();
  const batches: ManagedProductBatch[] = await batchRepository.listBatches();

  const allBatchIds = batches.map((b) => b.id);
  const allEvents = batches.flatMap((b) =>
    (b.events || []).map((e) => ({
      ...e,
      batchPublicId: b.publicId,
      productName: b.productName,
    })),
  );
  const allEventIds = allEvents.map((e) => e.id);
  const confirmedEvents = allEvents.filter((e) => e.status === "confirmed");
  const confirmedEventIds = confirmedEvents.map((e) => e.id);
  const solanaEvents = allEvents.filter((e) => e.solanaProof);
  const solanaAnchoredEventIds = solanaEvents.map((e) => e.id);
  const allDocs = allEvents.flatMap((e) =>
    (e.documentEvidence || []).map((d) => ({
      ...d,
      eventId: e.id,
      stage: e.stage,
      batchPublicId: e.batchPublicId,
    })),
  );
  const allDocIds = allDocs.map((d) => d.id);

  const prevState = loadPreviousState();

  const newBatches = prevState
    ? batches.filter((b) => !prevState.knownBatchIds.includes(b.id))
    : [];

  const newEvents = prevState
    ? allEvents.filter((e) => !prevState.knownEventIds.includes(e.id))
    : [];

  const newlyConfirmedEvents = prevState
    ? confirmedEvents.filter((e) => !prevState.confirmedEventIds.includes(e.id))
    : [];

  const newlyAnchoredEvents = prevState
    ? solanaEvents.filter((e) => !prevState.solanaAnchoredEventIds.includes(e.id))
    : [];

  const newDocuments = prevState
    ? allDocs.filter((d) => !prevState.documentIds.includes(d.id))
    : [];

  // Update saved state
  const newState: MonitorState = {
    lastCheckedAt: now,
    knownBatchIds: allBatchIds,
    knownEventIds: allEventIds,
    confirmedEventIds,
    solanaAnchoredEventIds,
    documentIds: allDocIds,
  };
  saveCurrentState(newState);

  // Format report
  console.log(`\n======================================================`);
  console.log(`🔍 [CHECK-DI MONITOR] Báo cáo kiểm tra hệ thống (${timeStr})`);
  console.log(`======================================================`);
  console.log(`🌐 Web Status (localhost:${PORT}): ${health.ok ? "🟢 Hoạt động tốt" : "🔴 Không phản hồi"} (${health.status}, ${health.latencyMs}ms)`);
  console.log(`📊 Tổng quan dữ liệu:`);
  console.log(`   - Tổng số lô hàng (Batches): ${batches.length}`);
  console.log(`   - Tổng số sự kiện chặng (Events): ${allEvents.length} (Đã xác nhận: ${confirmedEvents.length}, Draft: ${allEvents.length - confirmedEvents.length})`);
  console.log(`   - Sự kiện đã ghi nhận Solana Devnet: ${solanaEvents.length}`);
  console.log(`   - Chứng từ đính kèm (Documents): ${allDocs.length}`);
  console.log(`------------------------------------------------------`);

  const hasNewActivity =
    newBatches.length > 0 ||
    newEvents.length > 0 ||
    newlyConfirmedEvents.length > 0 ||
    newlyAnchoredEvents.length > 0 ||
    newDocuments.length > 0;

  if (!prevState) {
    console.log(`📌 Lần đầu khởi tạo theo dõi (Baseline Snapshot đã được lưu).`);
    console.log(`   Sẵn sàng phát hiện mọi thao tác mới trong các chu kỳ 5 phút tiếp theo.`);
  } else if (!hasNewActivity) {
    console.log(`✨ Không có thao tác mới kể từ lần kiểm tra trước (${new Date(prevState.lastCheckedAt).toLocaleTimeString("vi-VN")}).`);
  } else {
    console.log(`🚨 PHÁT HIỆN CÁC THAO TÁC MỚI:`);

    if (newBatches.length > 0) {
      console.log(`\n📦 Lô hàng mới tạo (${newBatches.length}):`);
      newBatches.forEach((b) => {
        console.log(`   • Mã lô: [${b.publicId}] - ${b.productName} (Xuất xứ: ${b.origin})`);
      });
    }

    if (newEvents.length > 0) {
      console.log(`\n📍 Sự kiện chặng mới thêm (${newEvents.length}):`);
      newEvents.forEach((e) => {
        console.log(`   • [${e.batchPublicId}] Chặng: ${e.stage} | Đơn vị: ${e.organizationName} | Trạng thái: ${e.status}`);
        console.log(`     Tóm tắt: ${e.summary}`);
      });
    }

    if (newlyConfirmedEvents.length > 0) {
      console.log(`\n✍️ Chặng mới được xác nhận/ký Ed25519 (${newlyConfirmedEvents.length}):`);
      newlyConfirmedEvents.forEach((e) => {
        console.log(`   • [${e.batchPublicId}] Chặng: ${e.stage} bởi ${e.organizationName}`);
        console.log(`     SHA-256 Hash: ${e.eventHash?.slice(0, 16)}...`);
      });
    }

    if (newlyAnchoredEvents.length > 0) {
      console.log(`\n⛓️ Chặng mới được ghi nhận on-chain Solana Devnet (${newlyAnchoredEvents.length}):`);
      newlyAnchoredEvents.forEach((e) => {
        console.log(`   • [${e.batchPublicId}] Chặng: ${e.stage} -> Event PDA: ${e.solanaProof?.eventPda || "N/A"}`);
        if (e.solanaProof?.transactionSignature) {
          console.log(`     Tx Sig: ${e.solanaProof.transactionSignature.slice(0, 20)}...`);
        }
      });
    }

    if (newDocuments.length > 0) {
      console.log(`\n📄 Chứng từ mới được upload / AI phân tích (${newDocuments.length}):`);
      newDocuments.forEach((d) => {
        console.log(`   • File: ${d.filename} (${(d.sizeBytes / 1024).toFixed(1)} KB)`);
        console.log(`     Mã SHA-256: ${d.sha256.slice(0, 16)}...`);
        if (d.extraction) {
          console.log(`     AI Demo Extraction: Qty=${d.extraction.quantity} ${d.extraction.unit || ""}, Batch=${d.extraction.batchId}`);
        }
      });
    }
  }

  console.log(`======================================================\n`);

  return {
    hasNewActivity,
    newBatchesCount: newBatches.length,
    newEventsCount: newEvents.length,
    newlyConfirmedCount: newlyConfirmedEvents.length,
    newlyAnchoredCount: newlyAnchoredEvents.length,
    newDocumentsCount: newDocuments.length,
    health,
  };
}

if (import.meta.main) {
  runMonitor().catch((err) => {
    console.error("Monitor execution error:", err);
    process.exitCode = 1;
  });
}
