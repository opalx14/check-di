"use client";

import { TourGuide, type TourStep } from "@/components/TourGuide";

const VERIFY_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="verify-product-card"]',
    title: "Thông tin nguồn gốc & Ảnh đã ký",
    description: "Xem tên nông sản, hành lang di chuyển từ nơi sản xuất đến điểm bán, mã QR công khai và ảnh chụp thực tế tại nguồn đã được khóa SHA-256.",
  },
  {
    target: '[data-tour="verify-status-chips"]',
    title: "4 tiêu chí toàn vẹn độc lập",
    description: "Kiểm tra tự động: Chuỗi hash SHA-256 không bị can thiệp, AI đối chiếu chứng từ (phiếu kiểm định, hóa đơn), bằng chứng Solana Devnet và chữ ký ảnh nguồn.",
  },
  {
    target: '[data-tour="verify-journey-timeline"]',
    title: "Stepper hành trình chuỗi cung ứng",
    description: "Chọn từng chặng để xem ai xác nhận, ở đâu, lúc nào, cảnh báo AI/data check và trạng thái Devnet proof; dùng nút Chặng trước / Chặng tiếp để duyệt tuần tự.",
  },
  {
    target: '[data-tour="verify-event-cards"]',
    title: "Bằng chứng On-Chain & Explorer",
    description: "Nhấn mở rộng từng chặng để kiểm tra tổ chức xác nhận, thời gian, mã băm SHA-256, chữ ký Ed25519 và liên kết kiểm tra Event PDA trực tiếp trên Solana Devnet Explorer.",
  },
];

export function ConsumerVerifyTourGuide() {
  return (
    <TourGuide
      tourKey="consumer_verify"
      flowTitle="Hướng dẫn xác thực QR"
      role="consumer"
      steps={VERIFY_TOUR_STEPS}
    />
  );
}
