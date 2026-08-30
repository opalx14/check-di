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
      message: `Hao hụt thực tế ${actualLossPercent.toFixed(1)}% khớp mức khai báo ${input.declaredLossPercent.toFixed(1)}%.`,
      fields: ["inputWeightKg", "outputWeightKg", "declaredLossPercent"],
    };
  }

  return {
    status: "warning",
    message: `Hao hụt thực tế ${actualLossPercent.toFixed(1)}% lệch mức khai báo ${input.declaredLossPercent.toFixed(1)}%.`,
    fields: ["inputWeightKg", "outputWeightKg", "declaredLossPercent"],
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
      message: "Không đọc được ngày thu hoạch hoặc ngày kiểm định.",
      fields: ["harvestAt", "inspectionAt"],
    };
  }

  if (inspection >= harvest) {
    return {
      status: "matched",
      message: "Thời điểm kiểm định diễn ra sau thời điểm thu hoạch.",
      fields: ["harvestAt", "inspectionAt"],
    };
  }

  return {
    status: "warning",
    message: "Phát hiện kiểm định diễn ra trước thời điểm thu hoạch.",
    fields: ["harvestAt", "inspectionAt"],
  };
}
