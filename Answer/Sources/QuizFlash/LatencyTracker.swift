/* '''
 작성: Codex · 2026-09-17
 변경: 최초 구현 — 단조 시계 측정, 최근 20건, 오래된 요청 차단.
 실행: scripts/build-app.sh 후 QuizFlash.app 실행.
 ''' */
import Foundation
import Combine
import OSLog

struct LatencySample: Sendable {
    let id: UUID
    let t0: ContinuousClock.Instant
    let t1: ContinuousClock.Instant
    let t2: ContinuousClock.Instant
    let t3: ContinuousClock.Instant
    let t4: ContinuousClock.Instant
    let t5: ContinuousClock.Instant
    let attempts: Int

    static func milliseconds(_ start: ContinuousClock.Instant, _ end: ContinuousClock.Instant) -> Double {
        let parts = start.duration(to: end).components
        return Double(parts.seconds) * 1_000 + Double(parts.attoseconds) / 1e15
    }

    var total: Double { Self.milliseconds(t0, t5) }
    var summary: String {
        """
        QuizFlash \(id.uuidString.prefix(8)) · Image Only · \(attempts) attempt(s)
        Capture: \(Int(Self.milliseconds(t0, t1))) ms
        Preprocess: \(Int(Self.milliseconds(t1, t2))) ms
        Request setup: \(Int(Self.milliseconds(t2, t3))) ms
        API/model: \(Int(Self.milliseconds(t3, t4))) ms
        Render: \(Int(Self.milliseconds(t4, t5))) ms
        TOTAL: \(Int(total)) ms
        """
    }
}

@MainActor
final class LatencyTracker: ObservableObject {
    @Published private(set) var samples: [LatencySample] = []
    var average: Double? {
        guard !samples.isEmpty else { return nil }
        return samples.reduce(0) { $0 + $1.total } / Double(samples.count)
    }

    func record(_ sample: LatencySample) {
        samples.append(sample)
        if samples.count > 20 { samples.removeFirst(samples.count - 20) }
        // UI 표시가 끝난 뒤 로깅하므로 T5에 로그 비용이 포함되지 않는다.
        Task.detached(priority: .utility) {
            let summary = sample.summary
            Logger(subsystem: "com.quizflash.app", category: "latency").notice("\(summary, privacy: .public)")
            print(summary)
        }
    }
}

/// Cancellation is cooperative; this identity guard also blocks late completions.
struct RequestState {
    private(set) var currentID: UUID?

    mutating func begin() -> UUID {
        let id = UUID()
        currentID = id
        return id
    }

    func isCurrent(_ id: UUID) -> Bool { currentID == id }

    @discardableResult
    mutating func finish(_ id: UUID) -> Bool {
        guard isCurrent(id) else { return false }
        currentID = nil
        return true
    }

    mutating func invalidate() { currentID = nil }
}
