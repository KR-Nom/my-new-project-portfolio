/*
 작성자: 장현진 / Codex
 작성일: 2026-09-17
 변경사항: Carbon 전역 단축키와 필요할 때만 사용하는 Esc 등록 추가.
 프로그램 설명: 추가 개인정보 권한 없이 Option + Space 입력을 전달한다.
 실행 방법: QuizFlash 앱에서 register() 호출.
 */

import AppKit
import Carbon

private let quizFlashHotKeySignature: OSType = 0x51465A48 // QFZH

@MainActor
final class HotKeyManager {
    var onAsk: (() -> Void)?
    var onEscape: (() -> Void)?

    private var handler: EventHandlerRef?
    private var askHotKey: EventHotKeyRef?
    private var escapeHotKey: EventHotKeyRef?
    private var askIsPressed = false

    struct RegistrationError: LocalizedError {
        let operation: String
        let status: OSStatus

        var errorDescription: String? {
            "\(operation) failed (OSStatus \(status)). Another app or system shortcut may already use this key."
        }
    }

    func register() throws {
        guard askHotKey == nil else { return }
        try installHandlerIfNeeded()

        let status = RegisterEventHotKey(
            UInt32(kVK_Space), UInt32(optionKey),
            EventHotKeyID(signature: quizFlashHotKeySignature, id: 1),
            GetApplicationEventTarget(), UInt32(kEventHotKeyExclusive), &askHotKey
        )
        guard status == noErr else {
            throw RegistrationError(operation: "Option + Space registration", status: status)
        }
    }

    func setEscapeEnabled(_ enabled: Bool) {
        if !enabled {
            if let escapeHotKey { UnregisterEventHotKey(escapeHotKey) }
            escapeHotKey = nil
            return
        }
        guard escapeHotKey == nil else { return }
        do {
            try installHandlerIfNeeded()
            let status = RegisterEventHotKey(
                UInt32(kVK_Escape), 0,
                EventHotKeyID(signature: quizFlashHotKeySignature, id: 2),
                GetApplicationEventTarget(), UInt32(kEventHotKeyExclusive), &escapeHotKey
            )
            guard status == noErr else {
                throw RegistrationError(operation: "Temporary Esc registration", status: status)
            }
        } catch {
            print("QuizFlash: \(error.localizedDescription)")
        }
    }

    func unregister() {
        setEscapeEnabled(false)
        if let askHotKey { UnregisterEventHotKey(askHotKey) }
        if let handler { RemoveEventHandler(handler) }
        askHotKey = nil
        handler = nil
        askIsPressed = false
    }

    private func installHandlerIfNeeded() throws {
        guard handler == nil else { return }
        var eventTypes = [
            EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed)),
            EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyReleased))
        ]
        let status = InstallEventHandler(
            GetApplicationEventTarget(), quizFlashHotKeyCallback,
            eventTypes.count, &eventTypes,
            Unmanaged.passUnretained(self).toOpaque(), &handler
        )
        guard status == noErr else {
            throw RegistrationError(operation: "Hotkey event handler installation", status: status)
        }
    }

    fileprivate func receive(id: UInt32, kind: UInt32) {
        if id == 1 {
            if kind == UInt32(kEventHotKeyReleased) {
                askIsPressed = false
            } else if kind == UInt32(kEventHotKeyPressed), !askIsPressed {
                askIsPressed = true // Holding Space must not repeatedly cancel and restart requests.
                onAsk?()
            }
        } else if id == 2, kind == UInt32(kEventHotKeyPressed), escapeHotKey != nil {
            onEscape?()
        }
    }
}

private func quizFlashHotKeyCallback(
    _ nextHandler: EventHandlerCallRef?, _ event: EventRef?, _ context: UnsafeMutableRawPointer?
) -> OSStatus {
    guard let event, let context else { return OSStatus(eventNotHandledErr) }
    var hotKeyID = EventHotKeyID()
    let status = GetEventParameter(
        event, EventParamName(kEventParamDirectObject), EventParamType(typeEventHotKeyID),
        nil, MemoryLayout<EventHotKeyID>.size, nil, &hotKeyID
    )
    guard status == noErr, hotKeyID.signature == quizFlashHotKeySignature else {
        return OSStatus(eventNotHandledErr)
    }

    let manager = Unmanaged<HotKeyManager>.fromOpaque(context).takeUnretainedValue()
    let id = hotKeyID.id
    let kind = GetEventKind(event)
    if Thread.isMainThread {
        MainActor.assumeIsolated { manager.receive(id: id, kind: kind) }
    } else {
        DispatchQueue.main.async { [weak manager] in manager?.receive(id: id, kind: kind) }
    }
    return noErr
}
