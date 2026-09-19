export type Locale = "vi" | "en";

export type NavDictionary = {
  journey: string;
  demo: string;
  participants: string;
  technology: string;
  safety: string;
  tryScan: string;
  createBatch: string;
  openMenu: string;
};

export type HeroDictionary = {
  badge: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  mobileTitle: string;
  mobileDescription: string;
  tags: [string, string, string];
  scanCta: string;
  mobileScanTitle: string;
  mobileScanHint: string;
  journeyCta: string;
  sampleBatch: string;
  productName: string;
  routeSummary: string;
  sampleDataBadge: string;
  latestStageLabel: string;
  latestStageValue: string;
  latestStageTime: string;
  qrActionLabel: string;
  qrActionValue: string;
  qrActionDetail: string;
  journeyStages: {
    farm: { label: string; place: string };
    packing: { label: string; place: string };
    inspection: { label: string; place: string };
    logistics: { label: string; place: string };
    retail: { label: string; place: string };
  };
};

export type GettingStartedDictionary = {
  tourWelcomeTitle: string;
  tourWelcomeText: string;
  tourSkip: string;
  tourBack: string;
  tourNext: string;
  tourDone: string;
  tourSteps: [
    { title: string; text: string },
    { title: string; text: string },
    { title: string; text: string },
  ];
};

export type CoreFlowDictionary = {
  badge: string;
  title: string;
  description: string;
  sourceVisualLabel: string;
  sourceVisualTitle: string;
  sourceVisualText: string;
  resultLabel: string;
  resultTitle: string;
  resultText: string;
  sampleProductLabel: string;
  steps: Array<{
    title: string;
    text: string;
  }>;
};

export type SandboxDictionary = {
  simulatedDataBadge: string;
  title: string;
  description: string;
  pause: string;
  playJourney: string;
  backToMap: string;
  simulateQrScan: string;
  mapTitle: string;
  mapSubtitle: string;
  stageCounter: string;
  originLabel: string;
  destinationLabel: string;
  progressLabel: string;
  stagesCount: string;
  journeyTitle: string;
  viewingStage: string;
  recordedStatus: string;
  signedStatus: string;
  orgLabel: string;
  locationLabel: string;
  timeLabel: string;
  batchCodeLabel: string;
  stageDataLabel: string;
  aiCheckTitle: string;
  aiCheckEmpty: string;
  documentsTitle: string;
  documentsValue: string;
  dataHashTitle: string;
  hashNote: string;
  chainProofTitle: string;
  signedByLabel: string;
  previousHashLabel: string;
  signatureLabel: string;
  demoChainStatus: string;
  consumerVerifiedAllStages: string;
  consumerQrTitle: string;
  consumerNotice: string;
  mobileAiTitle: string;
  mobileAiSummary: string;
  mobileAiChecks: [string, string, string];
  mobileShowStages: string;
  mobileHideStages: string;
  telemetryDistance: string;
  telemetryDuration: string;
  telemetryColdChain: string;
  telemetryRoute: string;
  passportTitle: string;
  passportSubtitle: string;
  aiCardTitle: string;
  aiCardStatus: string;
  aiCardPoint1: string;
  aiCardPoint2: string;
  aiCardPoint3: string;
  tabOverview: string;
  tabAiCheck: string;
  tabDocuments: string;
  copyHash: string;
  copied: string;
  openProof: string;
  closeProof: string;
  stages: {
    farm: {
      title: string;
      org: string;
      location: string;
      time: string;
      detail: string;
      shortPlace: string;
      docName?: string;
      docType?: string;
      coords?: string;
      temp?: string;
    };
    packing: {
      title: string;
      org: string;
      location: string;
      time: string;
      detail: string;
      shortPlace: string;
      aiCheck: string;
      docName?: string;
      docType?: string;
      coords?: string;
      temp?: string;
    };
    inspection: {
      title: string;
      org: string;
      location: string;
      time: string;
      detail: string;
      shortPlace: string;
      aiCheck: string;
      docName?: string;
      docType?: string;
      coords?: string;
      temp?: string;
    };
    logistics: {
      title: string;
      org: string;
      location: string;
      time: string;
      detail: string;
      shortPlace: string;
      docName?: string;
      docType?: string;
      coords?: string;
      temp?: string;
    };
    retail: {
      title: string;
      org: string;
      location: string;
      time: string;
      detail: string;
      shortPlace: string;
      docName?: string;
      docType?: string;
      coords?: string;
      temp?: string;
    };
  };
};

export type DualTrackDictionary = {
  badge: string;
  title: string;
  description: string;
  groups: Array<{
    title: string;
    text: string;
  }>;
  competitionBanner: string;
};

export type ArchitectureDictionary = {
  badge: string;
  title: string;
  description: string;
  hashChainTitle: string;
  chainStages: [string, string, string, string, string];
  demoDisclaimer: string;
  offChainTitle: string;
  offChainText: string;
  onChainTitle: string;
  onChainText: string;
  immutabilityTitle: string;
  immutabilityText: string;
  registryLabel: string;
  registryNetwork: string;
  registryText: string;
};

export type ComplianceDictionary = {
  badge: string;
  title: string;
  description: string;
  rules: [string, string, string, string];
};

export type FooterDictionary = {
  brandTitle: string;
  brandTagline: string;
  copyright: string;
};

export type ConsumerVerifyDictionary = {
  scanAnother: string;
  chainValid: string;
  needsCheck: string;
  aiNoWarnings: string;
  aiWarnings: string;
  devnetProof: string;
  sourcePhotoSigned: string;
  sourcePhotoMissing: string;
  journey: string;
  journeyHint: string;
  traceDetails: string;
  confirmedStages: string;
  tapStageProof: string;
  previousStage: string;
  nextStage: string;
  devnetIntegrity: string;
  verified: string;
  aiDataChecks: string;
  noWarnings: string;
  warningCount: string;
  eventPda: string;
  documents: string;
  eventHash: string;
  signer: string;
  devnetTxid: string;
  notAnchored: string;
  signedImage: string;
  viewSolanaProof: string;
  field: string;
  extracted: string;
  expected: string;
  independentTitle: string;
  independentDescription: string;
  independentAction: string;
  independentLoading: string;
  independentFailed: string;
  independentSummary: string;
  notVerified: string;
  freshRpcNote: string;
  tourProductTitle: string;
  tourProductDescription: string;
  tourStatusTitle: string;
  tourStatusDescription: string;
  tourJourneyTitle: string;
  tourJourneyDescription: string;
  tourProofTitle: string;
  tourProofDescription: string;
  tourFlowTitle: string;
  stages: Record<"production" | "packing" | "inspection" | "logistics" | "retail", string>;
};

export type ConsumerScanDictionary = {
  supplierQuestion: string;
  title: string;
  description: string;
  cameraUnsupported: string;
  qrUnsupported: string;
  cameraOpenFailed: string;
  closeCamera: string;
  frameHint: string;
  openCamera: string;
  orEnterCode: string;
  placeholder: string;
  lookup: string;
  traceableProducts: string;
  openLiveBatch: string;
  sampleCatalog: string;
  fruitCount: string;
  tourCameraTitle: string;
  tourCameraDescription: string;
  tourInputTitle: string;
  tourInputDescription: string;
  tourGalleryTitle: string;
  tourGalleryDescription: string;
  tourGalleryAction: string;
  tourFlowTitle: string;
};

export type CommonDictionary = {
  switchLanguage: string;
  vietnamese: string;
  english: string;
};

export type Dictionary = {
  meta: {
    title: string;
    description: string;
  };
  nav: NavDictionary;
  hero: HeroDictionary;
  gettingStarted: GettingStartedDictionary;
  coreFlow: CoreFlowDictionary;
  sandbox: SandboxDictionary;
  dualTrack: DualTrackDictionary;
  architecture: ArchitectureDictionary;
  compliance: ComplianceDictionary;
  footer: FooterDictionary;
  consumerVerify: ConsumerVerifyDictionary;
  consumerScan: ConsumerScanDictionary;
  common: CommonDictionary;
};
