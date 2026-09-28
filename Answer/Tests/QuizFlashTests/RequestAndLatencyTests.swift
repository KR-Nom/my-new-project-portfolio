import Foundation
import Testing
@testable import QuizFlash

struct RequestAndLatencyTests {
    @Test
    func testLateOldResponseCannotReplaceNewAnswerOrFinishNewRequest() {
        var state = RequestState()
        let old = state.begin()
        let latest = state.begin()
        var displayed: Int?
        if state.isCurrent(latest) { displayed = 4 }
        if state.isCurrent(old) { displayed = 1 }
        #expect(displayed == 4)
        let oldFinished = state.finish(old)
        #expect(!oldFinished)
        #expect(state.isCurrent(latest))
        let latestFinished = state.finish(latest)
        #expect(latestFinished)
        #expect(!state.isCurrent(latest))
        #expect(!state.isCurrent(old))
    }

    @Test
    func testDismissalBlocksAnInFlightAnswer() {
        var state = RequestState()
        let id = state.begin()
        state.invalidate()
        #expect(!state.isCurrent(id))
        let dismissedFinished = state.finish(id)
        #expect(!dismissedFinished)
    }

    @Test @MainActor
    func testLatencyRetainsOnlyLast20SuccessfulRequests() {
        let tracker = LatencyTracker()
        let now = ContinuousClock.now
        for milliseconds in 1...25 {
            tracker.record(LatencySample(id: UUID(), t0: now, t1: now, t2: now, t3: now,
                                         t4: now, t5: now.advanced(by: .milliseconds(milliseconds)), attempts: 1))
        }
        #expect(tracker.samples.count == 20)
        #expect(tracker.samples.first?.total == 6)
        #expect(abs((tracker.average ?? 0) - 15.5) < 0.001)
    }

    @Test
    func testMonotonicTimingIncludesRequestSetup() {
        let now = ContinuousClock.now
        let sample = LatencySample(id: UUID(), t0: now,
                                   t1: now.advanced(by: .milliseconds(83)),
                                   t2: now.advanced(by: .milliseconds(104)),
                                   t3: now.advanced(by: .milliseconds(109)),
                                   t4: now.advanced(by: .milliseconds(1449)),
                                   t5: now.advanced(by: .milliseconds(1458)), attempts: 1)
        #expect(abs(sample.total - 1458) < 0.001)
        #expect(sample.summary.contains("Request setup: 5 ms"))
        #expect(sample.summary.contains("API/model: 1340 ms"))
    }
}
