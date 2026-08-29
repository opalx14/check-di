# Check-Di — AI Evaluation Plan

## AI job

AI hỗ trợ đọc và đối chiếu chứng từ của một trace event.

## Required outputs

Mỗi check phải có:

- trường dữ liệu đã đọc;
- nguồn/chứng từ liên quan;
- giá trị so sánh giữa các chặng;
- trạng thái `matched`, `warning` hoặc `needs_review`;
- giải thích ngắn cho cảnh báo.

## Example checks

- batch ID trên packing list có khớp lô hiện tại không;
- ngày kiểm định có hợp lý so với ngày thu hoạch/đóng gói không;
- số lượng đầu vào/đầu ra có chênh lệch bất thường không;
- địa điểm giao/nhận có khớp event logistics không.

## Guardrails

- Không có dữ liệu -> `needs_review`.
- Không tự kết luận gian lận.
- Không tự xác nhận nguồn gốc.
- Output phải qua schema validation.
- Demo fixtures phải được ghi rõ là fixture.

## Metrics planned

- field extraction accuracy;
- mismatch detection precision/recall trên fixture set;
- schema validity;
- unsupported-claim rate;
- human acceptance/edit rate.
