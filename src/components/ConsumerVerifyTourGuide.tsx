"use client";

import { TourGuide, type TourStep } from "@/components/TourGuide";
import { useI18n } from "@/lib/i18n";

export function ConsumerVerifyTourGuide() {
  const { t } = useI18n();
  const steps: TourStep[] = [
    {
      target: '[data-tour="verify-product-card"]',
      title: t("consumerVerify.tourProductTitle"),
      description: t("consumerVerify.tourProductDescription"),
    },
    {
      target: '[data-tour="verify-status-chips"]',
      title: t("consumerVerify.tourStatusTitle"),
      description: t("consumerVerify.tourStatusDescription"),
    },
    {
      target: '[data-tour="verify-journey-timeline"]',
      title: t("consumerVerify.tourJourneyTitle"),
      description: t("consumerVerify.tourJourneyDescription"),
    },
    {
      target: '[data-tour="verify-event-cards"]',
      title: t("consumerVerify.tourProofTitle"),
      description: t("consumerVerify.tourProofDescription"),
    },
  ];
  return (
    <TourGuide
      tourKey="consumer_verify"
      flowTitle={t("consumerVerify.tourFlowTitle")}
      role="consumer"
      steps={steps}
    />
  );
}
