import type { AIValidation } from "@/types/evidence";

export function checkPackingLoss(input: {
  inputWeightKg: number;
  outputWeightKg: number;
  declaredLossPercent: number;
}): AIValidation {
  const actualLossPercent =
    ((input.inputWeightKg - input.outputWeightKg) / input.inputWeightKg) * 100;
  const delta = Math.abs(actualLossPercent - input.declaredLossPercent);

  if (delta <= 0.25) {
    return {
      status: "matched",
      severity: "LOW",
      message: `Hao hụt thực tế ${actualLossPercent.toFixed(1)}% khớp mức khai báo ${input.declaredLossPercent.toFixed(1)}%.`,
      fields: ["inputWeightKg", "outputWeightKg", "declaredLossPercent"],
      evidence: {
        sourceField: "declaredLossPercent",
        sourceText: "Đối chiếu hao hụt tính từ input/output weight với mức khai báo.",
        extractedValue: Number(actualLossPercent.toFixed(2)),
        expectedValue: input.declaredLossPercent,
      },
    };
  }

  return {
    status: "warning",
    severity: delta >= 5 ? "HIGH" : "MEDIUM",
    message: `Hao hụt thực tế ${actualLossPercent.toFixed(1)}% lệch mức khai báo ${input.declaredLossPercent.toFixed(1)}%.`,
    fields: ["inputWeightKg", "outputWeightKg", "declaredLossPercent"],
    evidence: {
      sourceField: "declaredLossPercent",
      sourceText: "Đối chiếu hao hụt tính từ input/output weight với mức khai báo.",
      extractedValue: Number(actualLossPercent.toFixed(2)),
      expectedValue: input.declaredLossPercent,
    },
  };
}

export function checkChronology(input: {
  harvestAt: string;
  inspectionAt: string;
}): AIValidation {
  const harvest = new Date(input.harvestAt).getTime();
  const inspection = new Date(input.inspectionAt).getTime();

  if (Number.isNaN(harvest) || Number.isNaN(inspection)) {
    return {
      status: "needs_review",
      severity: "MEDIUM",
      message: "Không đọc được ngày thu hoạch hoặc ngày kiểm định.",
      fields: ["harvestAt", "inspectionAt"],
      evidence: {
        sourceField: "occurredAt",
        sourceText: "Không thể parse một trong hai timestamp để đối chiếu thứ tự thời gian.",
        extractedValue: input.inspectionAt,
        expectedValue: input.harvestAt,
      },
    };
  }

  if (inspection >= harvest) {
    return {
      status: "matched",
      severity: "LOW",
      message: "Thời điểm kiểm định diễn ra sau thời điểm thu hoạch.",
      fields: ["harvestAt", "inspectionAt"],
      evidence: {
        sourceField: "occurredAt",
        sourceText: "So sánh timestamp kiểm định với timestamp thu hoạch đã xác nhận.",
        extractedValue: input.inspectionAt,
        expectedValue: input.harvestAt,
      },
    };
  }

  return {
    status: "warning",
    severity: "HIGH",
    message: "Phát hiện kiểm định diễn ra trước thời điểm thu hoạch.",
    fields: ["harvestAt", "inspectionAt"],
    evidence: {
      sourceField: "occurredAt",
      sourceText: "Timestamp kiểm định phải bằng hoặc sau timestamp thu hoạch.",
      extractedValue: input.inspectionAt,
      expectedValue: input.harvestAt,
    },
  };
}
