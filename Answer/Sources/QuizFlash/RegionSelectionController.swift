/*
 '''
 작성자: 장현진 / Codex
 작성일: 2026-09-17
 변경사항: 포커스를 유지하는 드래그 영역 선택 구현
 설명: 마우스가 있는 디스플레이에서 문제와 보기만 선택한다.
 실행 방법: 메뉴바 → Set Capture Region
 '''
 */

import AppKit

@MainActor
final class RegionSelectionController {
    private var panel: SelectionPanel?
    private var completion: ((CaptureRegion?) -> Void)?
    var isSelecting: Bool { panel != nil }

    func beginSelection(completion: @escaping (CaptureRegion?) -> Void) {
        cancel()
        guard let screen = NSScreen.screens.first(where: { $0.frame.contains(NSEvent.mouseLocation) }) ?? NSScreen.main,
              let displayNumber = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber else {
            completion(nil)
            return
        }
        self.completion = completion
        let screenFrame = screen.frame
        let displayID = displayNumber.uint32Value
        let panel = SelectionPanel(contentRect: screenFrame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.setFrame(screenFrame, display: false)
        panel.level = .screenSaver
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.hidesOnDeactivate = false
        panel.isFloatingPanel = true
        panel.becomesKeyOnlyIfNeeded = true
        panel.animationBehavior = .none
        panel.acceptsMouseMovedEvents = true
        panel.isReleasedWhenClosed = false

        let view = SelectionView(frame: CGRect(origin: .zero, size: screenFrame.size))
        view.onSelection = { [weak self] localRect in
            let region = localRect.flatMap {
                CaptureRegion.make(
                    selectionInScreenCoordinates: $0.offsetBy(dx: screenFrame.minX, dy: screenFrame.minY),
                    screenFrame: screenFrame,
                    displayID: displayID,
                    displayUUID: CaptureRegion.uuid(for: displayID)
                )
            }
            self?.finish(region)
        }
        panel.contentView = view
        self.panel = panel
        panel.orderFrontRegardless()          // Never make this panel key or activate the app.
    }

    func cancel() {
        finish(nil)
    }

    private func finish(_ region: CaptureRegion?) {
        let callback = completion
        completion = nil
        panel?.orderOut(nil)
        panel?.close()
        panel = nil
        callback?(region)
    }
}

private final class SelectionPanel: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

@MainActor
private final class SelectionView: NSView {
    var onSelection: ((CGRect?) -> Void)?
    private var dragStart: CGPoint?
    private var selection: CGRect?

    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    override func resetCursorRects() {
        addCursorRect(bounds, cursor: .crosshair)
    }

    override func mouseDown(with event: NSEvent) {
        dragStart = convert(event.locationInWindow, from: nil)
        selection = nil
        needsDisplay = true
    }

    override func mouseDragged(with event: NSEvent) {
        updateSelection(with: event)
    }

    override func mouseUp(with event: NSEvent) {
        updateSelection(with: event)
        onSelection?(selection)
    }

    override func rightMouseDown(with event: NSEvent) {
        onSelection?(nil)
    }

    private func updateSelection(with event: NSEvent) {
        guard let dragStart else { return }
        let point = convert(event.locationInWindow, from: nil)
        selection = CGRect(
            x: min(dragStart.x, point.x), y: min(dragStart.y, point.y),
            width: abs(point.x - dragStart.x), height: abs(point.y - dragStart.y)
        ).intersection(bounds)
        needsDisplay = true
    }

    override func draw(_ dirtyRect: NSRect) {
        NSColor.black.withAlphaComponent(0.28).setFill()
        bounds.fill()
        if let selection, !selection.isNull {
            NSGraphicsContext.saveGraphicsState()
            NSGraphicsContext.current?.compositingOperation = .clear
            selection.fill()
            NSGraphicsContext.restoreGraphicsState()
            NSColor.white.setStroke()
            let outline = NSBezierPath(rect: selection.insetBy(dx: 1, dy: 1))
            outline.lineWidth = 2
            outline.stroke()
        }
        let guidance = "문제 + 보기 4개를 드래그하세요. 타이머는 영역에서 제외하세요.   Esc / 우클릭: 취소"
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center
        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 16, weight: .semibold),
            .foregroundColor: NSColor.white,
            .paragraphStyle: paragraph
        ]
        let guideRect = CGRect(x: 24, y: bounds.maxY - 105, width: max(0, bounds.width - 48), height: 60)
        NSColor.black.withAlphaComponent(0.7).setFill()
        NSBezierPath(roundedRect: guideRect.insetBy(dx: 0, dy: -10), xRadius: 8, yRadius: 8).fill()
        (guidance as NSString).draw(in: guideRect, withAttributes: attributes)
    }
}
