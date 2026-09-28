/*
 작성자: 장현진 / Codex
 작성일: 2026-09-17
 변경사항: 포커스를 가져오지 않는 정답 패널과 2.5초 자동 닫기 추가.
 프로그램 설명: 지정된 화면의 오른쪽 위에 숫자 또는 짧은 오류만 표시한다.
 실행 방법: QuizFlash 앱에서 show(_:on:) 호출.
 */

import AppKit
import QuartzCore

@MainActor
final class AnswerOverlayController {
    var onVisibilityChanged: ((Bool) -> Void)?
    var isVisible: Bool { panel.isVisible }

    private let panel: AnswerPanel
    private let answerView: AnswerView
    private var hideTask: Task<Void, Never>?

    init() {
        let frame = NSRect(x: 0, y: 0, width: 132, height: 100)
        answerView = AnswerView(frame: frame)
        panel = AnswerPanel(
            contentRect: frame, styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered, defer: false
        )
        panel.contentView = answerView
        panel.level = .statusBar
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .ignoresCycle]
        panel.animationBehavior = .none
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.hidesOnDeactivate = false
        panel.canHide = false
        panel.isReleasedWhenClosed = false
        panel.becomesKeyOnlyIfNeeded = true
        panel.ignoresMouseEvents = true
        panel.isMovable = false
        panel.title = "QuizFlash Answer"
    }

    @discardableResult
    func show(_ text: String, on displayID: CGDirectDisplayID? = nil) -> ContinuousClock.Instant {
        hideTask?.cancel()
        let screen = NSScreen.screens.first {
            ($0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value == displayID
        } ?? NSScreen.main ?? NSScreen.screens.first
        if let screen {
            let visibleFrame = screen.visibleFrame
            panel.setFrameOrigin(NSPoint(
                x: visibleFrame.maxX - panel.frame.width - 18,
                y: visibleFrame.maxY - panel.frame.height - 18
            ))
        }

        answerView.text = ["1", "2", "3", "4", "API", "KEY", "NET", "?"].contains(text) ? text : "?"
        answerView.needsDisplay = true
        let wasVisible = isVisible
        panel.orderFrontRegardless() // No activation, key-window change, or focus transfer.
        panel.displayIfNeeded()
        CATransaction.flush()
        let renderedAt = ContinuousClock.now // AppKit drawing submitted; not a hardware display timestamp.

        if !wasVisible { onVisibilityChanged?(true) }
        hideTask = Task { [weak self] in
            do { try await Task.sleep(for: .milliseconds(2_500)) }
            catch { return }
            guard !Task.isCancelled else { return }
            self?.hide()
        }
        return renderedAt
    }

    func hide() {
        hideTask?.cancel()
        hideTask = nil
        guard isVisible else { return }
        panel.orderOut(nil)
        onVisibilityChanged?(false)
    }
}

@MainActor
private final class AnswerPanel: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

@MainActor
private final class AnswerView: NSView {
    var text = "?"

    override func draw(_ dirtyRect: NSRect) {
        NSColor(calibratedWhite: 0.06, alpha: 0.94).setFill()
        NSBezierPath(roundedRect: bounds, xRadius: 10, yRadius: 10).fill()
        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.monospacedDigitSystemFont(ofSize: text.count == 1 ? 72 : 37, weight: .bold),
            .foregroundColor: NSColor.white
        ]
        let label = text as NSString
        let size = label.size(withAttributes: attributes)
        label.draw(at: NSPoint(x: (bounds.width - size.width) / 2, y: (bounds.height - size.height) / 2),
                   withAttributes: attributes)
    }
}
