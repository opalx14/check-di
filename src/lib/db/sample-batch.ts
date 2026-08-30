import { checkChronology, checkPackingLoss } from "@/lib/ai/trace-checks";
import {
  confirmTraceEvent,
  verifyTraceChain,
  type ConfirmTraceEventInput,
} from "@/lib/traceability/server";
import type { ProductBatch, TraceEvent } from "@/types/evidence";

const PUBLIC_ID = "DUR-260830-01";
const BATCH_ID = "batch-demo-ri6-001";

const harvestAt = "2026-08-30T06:40:00+07:00";
const inspectionAt = "2026-08-31T09:20:00+07:00";

const EVENT_INPUTS: ConfirmTraceEventInput[] = [
  {
    id: "evt-farm-001",
    batchId: BATCH_ID,
    stage: "production",
    organizationId: "org-minh-phat-farm",
    organizationName: "Vườn Minh Phát",
    location: "Krông Pắc, Đắk Lắk",
    occurredAt: harvestAt,
    summary: "Thu hoạch 1.200 kg sầu riêng Ri6 và tạo lô DUR-260830-01.",
    documents: ["Nhật ký thu hoạch", "VietGAP #VG-2026"],
    metrics: {
      harvestedWeightKg: 1200,
      variety: "Ri6",
    },
    aiValidations: [],
  },
  {
    id: "evt-packing-001",
    batchId: BATCH_ID,
    stage: "packing",
    organizationId: "org-dak-farm-coop",
    organizationName: "HTX Đắk Farm",
    location: "Buôn Ma Thuột, Đắk Lắk",
    occurredAt: "2026-08-30T14:15:00+07:00",
    summary: "Nhận 1.200 kg, đóng gói 1.080 kg và khai báo hao hụt 10%.",
    documents: ["Packing list #PK-0830", "Biên bản bàn giao lô"],
    metrics: {
      inputWeightKg: 1200,
      outputWeightKg: 1080,
      declaredLossPercent: 10,
    },
    aiValidations: [
      checkPackingLoss({
        inputWeightKg: 1200,
        outputWeightKg: 1080,
        declaredLossPercent: 10,
      }),
    ],
  },
  {
    id: "evt-inspection-001",
    batchId: BATCH_ID,
    stage: "inspection",
    organizationId: "org-qc-demo",
    organizationName: "Trung tâm QC Demo",
    location: "Đắk Lắk",
    occurredAt: inspectionAt,
    summary: "Liên kết phiếu kiểm nghiệm với đúng mã lô và ngày lấy mẫu.",
    documents: ["QC analysis #QC-260831"],
    metrics: {
      residueWithinLimit: true,
    },
    aiValidations: [checkChronology({ harvestAt, inspectionAt })],
  },
  {
    id: "evt-logistics-001",
    batchId: BATCH_ID,
    stage: "logistics",
    organizationId: "org-green-route",
    organizationName: "Green Route Logistics",
    location: "Đắk Lắk → TP.HCM",
    occurredAt: "2026-09-01T05:30:00+07:00",
    summary: "Xe lạnh nhận lô và vận chuyển đến kho TP.HCM.",
    documents: ["Vận đơn xe lạnh #GR-0901"],
    metrics: {
      coldChainTemperatureC: 18,
      distanceKm: 354,
    },
    aiValidations: [],
  },
  {
    id: "evt-retail-001",
    batchId: BATCH_ID,
    stage: "retail",
    organizationId: "org-fresh-market-q7",
    organizationName: "Fresh Market Quận 7",
    location: "Quận 7, TP.HCM",
    occurredAt: "2026-09-03T08:10:00+07:00",
    summary: "Điểm bán xác nhận đã nhận lô và mở trạng thái tra cứu công khai.",
    documents: ["Biên bản nhận hàng #FM-0903"],
    metrics: {
      receivedWeightKg: 1080,
    },
    aiValidations: [],
  },
];

function buildSignedEvents(): TraceEvent[] {
  const events: TraceEvent[] = [];
  let previousEventHash = "GENESIS";

  for (const input of EVENT_INPUTS) {
    const event = confirmTraceEvent(input, previousEventHash);
    events.push(event);
    previousEventHash = event.eventHash ?? previousEventHash;
  }

  return events;
}

export type SampleBatchRecord = ProductBatch & {
  chainVerification: ReturnType<typeof verifyTraceChain>;
};

export function getSampleBatch(publicId: string): SampleBatchRecord | null {
  if (publicId !== PUBLIC_ID) return null;

  const events = buildSignedEvents();

  return {
    id: BATCH_ID,
    publicId: PUBLIC_ID,
    productName: "Sầu riêng Ri6",
    origin: "Krông Pắc, Đắk Lắk",
    events,
    chainVerification: verifyTraceChain(events),
  };
}

export function getSamplePublicId() {
  return PUBLIC_ID;
}
