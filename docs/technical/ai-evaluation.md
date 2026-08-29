# Check-Di — AI Evaluation Plan

Status: **foundation only**.

## Output contract to enforce

Mỗi AI-generated skill claim phải có:
- skill/claim;
- evidence pointer(s);
- reason;
- confidence;
- review status;
- rubric version;
- model version.

Nếu evidence không đủ, output phải chuyển sang `needs_review` thay vì bịa claim.

## Metrics planned

- Structured JSON validity
- Evidence citation coverage
- Unsupported-claim rate
- Missing-evidence handling
- Contradiction handling
- Human acceptance/edit/reject rate

## Fixture strategy

Tạo fixed fixtures cho ít nhất:
- GOOD evidence case;
- MISSING evidence case;
- CONTRADICTION case;
- TEAM evidence / attribution uncertain case.

Không dùng screenshot chatbot làm bằng chứng duy nhất cho AI integration.
