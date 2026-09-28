/* '''
 작성: Codex · 2026-09-17
 변경: 최초 구현 — 메뉴바, 최신 요청 우선 파이프라인, 앱 생명주기.
 실행: scripts/build-app.sh && open build/QuizFlash.app
 ''' */
import AppKit
import SwiftUI
import OSLog

@main
struct QuizFlashApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    var body: some Scene { Settings { EmptyView() } }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var controller: AppController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        let controller = AppController()
        self.controller = controller
        if ProcessInfo.processInfo.arguments.contains("--smoke-test") {
            controller.runSmokeTest()
        } else {
            controller.start()
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
    func applicationWillTerminate(_ notification: Notification) { controller?.stop() }
}

@MainActor
final class AppController: NSObject, NSMenuDelegate {
    private let settings = AppSettings()
    private let latency = LatencyTracker()
    private let capture = CaptureManager()
    private let client = OpenAIClient()
    private let pdfClient = PDFKnowledgeClient()
    private let selection = RegionSelectionController()
    private let overlay = AnswerOverlayController()
    private let hotKeys = HotKeyManager()
    private let settingsWindow = SettingsController()
    private var statusItem: NSStatusItem?
    private var requestTask: Task<Void, Never>?
    private var requestState = RequestState()
    private var shortcutError: String?
    private let logger = Logger(subsystem: "com.quizflash.app", category: "app")

    func start() {
        configureMenuAndHotKeys()
        NotificationCenter.default.addObserver(self, selector: #selector(displaysChanged),
                                               name: NSApplication.didChangeScreenParametersNotification, object: nil)
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(willSleep),
                                                          name: NSWorkspace.willSleepNotification, object: nil)
        Task {
            await settings.loadKey()
            await capture.prepare()
        }
    }

    private func configureMenuAndHotKeys() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.title = "QF"
        item.button?.toolTip = "QuizFlash · ⌥ Space"
        item.button?.setAccessibilityLabel("QuizFlash")
        let menu = NSMenu()
        menu.delegate = self
        item.menu = menu
        statusItem = item
        hotKeys.onAsk = { [weak self] in self?.captureSavedRegionAndAsk() }
        hotKeys.onEscape = { [weak self] in
            guard let self else { return }
            self.selection.cancel()
            self.cancelCurrentRequest()
            self.overlay.hide()
            self.updateEscape()
        }
        overlay.onVisibilityChanged = { [weak self] _ in self?.updateEscape() }
        do { try hotKeys.register() }
        catch {
            shortcutError = error.localizedDescription
            logError(error.localizedDescription)
        }
        menuNeedsUpdate(menu)
    }

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()
        add("Set Capture Region", action: #selector(setCaptureRegion), to: menu)
        add("Ask Now    ⌥ Space", action: #selector(captureSavedRegionAndAsk), to: menu)
        add("Settings…", action: #selector(showSettings), to: menu)
        menu.addItem(.separator())
        let latencyItem = add("Show Latency", action: #selector(toggleLatency), to: menu)
        latencyItem.state = settings.showLatency ? .on : .off
        if settings.showLatency {
            if let average = latency.average, let last = latency.samples.last {
                add("Last: \(Int(last.total)) ms · Avg (\(latency.samples.count)): \(Int(average)) ms", action: nil, to: menu)
            } else {
                add("Latency: no successful requests yet", action: nil, to: menu)
            }
        }
        if settings.region == nil { add("먼저 문제 영역을 설정하세요", action: nil, to: menu) }
        if let shortcutError { add(shortcutError, action: nil, to: menu) }
        menu.addItem(.separator())
        add("Quit QuizFlash", action: #selector(quit), to: menu)
    }

    @discardableResult
    private func add(_ title: String, action: Selector?, to menu: NSMenu) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: "")
        item.target = self
        item.isEnabled = action != nil
        menu.addItem(item)
        return item
    }

    @objc func captureSavedRegionAndAsk() {
        let t0 = ContinuousClock.now
        guard !selection.isSelecting else { return }
        cancelCurrentRequest()
        overlay.hide()
        guard let region = settings.region else {
            showError("?", detail: "Set Capture Region을 먼저 선택하세요.")
            return
        }
        guard let key = settings.apiKey, !key.isEmpty else {
            showError("KEY", detail: "Settings 또는 OPENAI_API_KEY에 API 키를 설정하세요.")
            return
        }
        guard CGPreflightScreenCaptureAccess() else {
            showError("?", detail: "Settings에서 화면 캡처 권한을 허용하고 필요하면 앱을 재실행하세요.")
            return
        }
        let model = settings.modelName
        let answerDisplay = (try? region.resolvedDisplayID()) ?? region.displayID
        let id = requestState.begin()
        statusItem?.button?.title = "QF·"
        requestTask = Task { [weak self] in
            guard let self else { return }
            defer {
                if self.requestState.finish(id) {
                    self.requestTask = nil
                    self.statusItem?.button?.title = "QF"
                }
            }
            do {
                let image = try await self.capture.capture(region: region)
                let t1 = ContinuousClock.now
                try Task.checkCancellation()
                let compression = Task.detached(priority: .userInitiated) {
                    try Task.checkCancellation()
                    return try ImagePreprocessor.jpegData(from: image)
                }
                let jpeg = try await withTaskCancellationHandler {
                    try await compression.value
                } onCancel: {
                    compression.cancel()
                }
                let t2 = ContinuousClock.now
                try Task.checkCancellation()
                guard self.requestState.isCurrent(id) else { return }
                let vectorStoreID = self.settings.pdfKnowledge?.vectorStoreID
                var answer = try await self.client.ask(jpeg: jpeg, apiKey: key, model: model,
                                                       vectorStoreID: vectorStoreID)
                let t3 = answer.requestStarted
                var attempts = 1
                try Task.checkCancellation()
                guard self.requestState.isCurrent(id) else { return }
                if answer.digit == nil {
                    self.overlay.show("?", on: answerDisplay)
                    attempts = 2
                    answer = try await self.client.ask(jpeg: jpeg, apiKey: key, model: model,
                                                       vectorStoreID: vectorStoreID)
                }
                try Task.checkCancellation()
                guard self.requestState.isCurrent(id) else { return }
                guard let digit = answer.digit else {
                    let mode = vectorStoreID == nil ? "Image Only" : "Image + PDF"
                    self.showError("?", detail: "\(mode) 모드의 두 응답 모두 ASCII 1~4를 포함하지 않았습니다.")
                    return
                }
                let t5 = self.overlay.show(String(digit), on: answerDisplay)
                self.latency.record(LatencySample(id: id, t0: t0, t1: t1, t2: t2,
                                                  t3: t3, t4: answer.answerReceived, t5: t5, attempts: attempts))
            } catch is CancellationError {
                // A newer shortcut press owns the UI now.
            } catch {
                guard !Task.isCancelled, self.requestState.isCurrent(id) else { return }
                self.showError((error as? OpenAIClientError)?.overlayCode ?? "?", detail: error.localizedDescription)
            }
        }
    }

    @objc private func setCaptureRegion() {
        cancelCurrentRequest()
        overlay.hide()
        settingsWindow.hide()
        // Permission prompts are restricted to this explicit setup action, never the hotkey.
        guard CGPreflightScreenCaptureAccess() || CGRequestScreenCaptureAccess() else {
            showError("?", detail: "시스템 설정에서 화면 캡처 권한을 허용한 뒤 Set Capture Region을 다시 선택하세요.")
            return
        }
        selection.beginSelection { [weak self] region in
            guard let self else { return }
            if let region { self.settings.region = region }
            self.updateEscape()
            Task { await self.capture.invalidate(); await self.capture.prepare() }
        }
        updateEscape()
    }

    @objc private func showSettings() {
        settingsWindow.show(settings: settings, latency: latency,
                            selectRegion: { [weak self] in self?.setCaptureRegion() },
                            requestPermission: { [weak self] in self?.requestScreenPermission() },
                            selectPDF: { [weak self] in self?.selectPDF() },
                            removePDF: { [weak self] in self?.removePDF() })
    }

    private func selectPDF() {
        guard let key = settings.apiKey, !key.isEmpty else {
            settings.failPDFRegistration("API 키를 먼저 저장하세요.")
            return
        }
        let panel = NSOpenPanel()
        panel.title = "참고 PDF 선택"
        panel.allowedContentTypes = [.pdf]
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        guard panel.runModal() == .OK, let url = panel.url else { return }
        guard settings.beginPDFRegistration() else { return }
        let fileName = url.lastPathComponent
        let oldKnowledge = settings.pdfKnowledge
        Task { [weak self] in
            guard let self else { return }
            do {
                let accessed = url.startAccessingSecurityScopedResource()
                defer { if accessed { url.stopAccessingSecurityScopedResource() } }
                let data = try Data(contentsOf: url, options: [.mappedIfSafe])
                let knowledge = try await self.pdfClient.register(pdfData: data, fileName: fileName, apiKey: key)
                self.settings.finishPDFRegistration(knowledge)
                if let oldKnowledge { await self.pdfClient.remove(oldKnowledge, apiKey: key) }
            } catch {
                self.settings.failPDFRegistration(error.localizedDescription)
                self.logError("PDF 등록 실패: \(error.localizedDescription)")
            }
        }
    }

    private func removePDF() {
        guard let old = settings.clearPDFKnowledge(), let key = settings.apiKey else { return }
        Task { await pdfClient.remove(old, apiKey: key) }
    }

    private func requestScreenPermission() {
        if CGRequestScreenCaptureAccess() {
            Task { await capture.invalidate(); await capture.prepare() }
        } else {
            logError("시스템 설정 > 개인정보 보호 및 보안 > 화면 및 시스템 오디오 녹음에서 QuizFlash를 허용하세요.")
        }
    }

    @objc private func toggleLatency() { settings.showLatency.toggle() }
    @objc private func quit() { NSApp.terminate(nil) }
    @objc private func willSleep() { cancelCurrentRequest(); selection.cancel(); overlay.hide() }
    @objc private func displaysChanged() {
        cancelCurrentRequest()
        selection.cancel()
        overlay.hide()
        Task { await capture.invalidate() }
    }

    private func updateEscape() { hotKeys.setEscapeEnabled(overlay.isVisible || selection.isSelecting) }

    private func cancelCurrentRequest() {
        requestState.invalidate()
        requestTask?.cancel()
        requestTask = nil
        statusItem?.button?.title = "QF"
    }

    private func showError(_ code: String, detail: String) {
        let displayID = settings.region.flatMap { try? $0.resolvedDisplayID() }
        overlay.show(code, on: displayID)
        logError(detail)
    }

    private func logError(_ detail: String) {
        logger.error("\(detail, privacy: .public)")
        Task.detached(priority: .utility) { print("QuizFlash: \(detail)") }
    }

    func stop() {
        cancelCurrentRequest()
        overlay.hide()
        selection.cancel()
        hotKeys.unregister()
        NotificationCenter.default.removeObserver(self)
        NSWorkspace.shared.notificationCenter.removeObserver(self)
    }

    /// Runs the bundled UI path without screen capture, credentials, or API calls.
    func runSmokeTest() {
        let frontmost = NSWorkspace.shared.frontmostApplication?.processIdentifier
        configureMenuAndHotKeys()
        overlay.show("3")
        Task {
            try? await Task.sleep(for: .milliseconds(250))
            let sameApp = NSWorkspace.shared.frontmostApplication?.processIdentifier == frontmost
            let nonKey = NSApp.keyWindow == nil && NSApp.mainWindow == nil
            let visible = overlay.isVisible
            print("SMOKE overlayVisible=\(visible) nonKey=\(nonKey) foregroundPreserved=\(sameApp) hotkeyRegistered=\(shortcutError == nil)")
            try? await Task.sleep(for: .milliseconds(2600))
            let autoHidden = !overlay.isVisible
            print("SMOKE autoHide=\(autoHidden)")
            selection.beginSelection { _ in }
            updateEscape()
            let selecting = selection.isSelecting && NSApp.keyWindow == nil
            let selectionPreservedFocus = NSWorkspace.shared.frontmostApplication?.processIdentifier == frontmost
            selection.cancel()
            updateEscape()
            showSettings()
            let settingsPreservedFocus = NSWorkspace.shared.frontmostApplication?.processIdentifier == frontmost
                && NSApp.keyWindow == nil
            settingsWindow.hide()
            print("SMOKE selectionNonKey=\(selecting) selectionForegroundPreserved=\(selectionPreservedFocus) settingsForegroundPreserved=\(settingsPreservedFocus)")
            print("SMOKE screenCaptureAuthorized=\(CGPreflightScreenCaptureAccess()) (preflight only; no capture)")
            fflush(stdout)
            stop()
            if !(sameApp && nonKey && visible && autoHidden && shortcutError == nil
                 && selecting && selectionPreservedFocus && settingsPreservedFocus) { exit(1) }
            NSApp.terminate(nil)
        }
    }
}
