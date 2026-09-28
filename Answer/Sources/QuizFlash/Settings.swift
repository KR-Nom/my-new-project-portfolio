/* '''
 작성: Codex · 2026-09-17
 변경: 최초 구현 — 설정 저장, 환경변수 우선 API 키, Keychain, 비활성 패널.
 변경: 2026-09-17 — Keychain 작업 직렬화와 인증창 차단, 저장값 UTF-8 검증.
 실행: 메뉴바 Settings…에서 키/모델/화면 캡처 권한 설정.
 ''' */
import AppKit
import SwiftUI
import Security

private actor APIKeychain {
    static let shared = APIKeychain()
    private let service = "com.quizflash.app"
    private let account = "openai-api-key"
    private var interactionSuppressionStatus: OSStatus?

    private init() {}

    private var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: account,
         kSecUseAuthenticationUI as String: kSecUseAuthenticationUIFail]
    }

    private func prepareWithoutPrompts() throws {
        if interactionSuppressionStatus == nil {
            // Legacy login Keychain can ignore the per-query no-UI flag. This deprecated
            // macOS API disables optional Keychain UI for this app process only. Keep it
            // disabled: restoring it could allow a later call to steal browser focus.
            interactionSuppressionStatus = SecKeychainSetUserInteractionAllowed(false)
        }
        guard let status = interactionSuppressionStatus, status == errSecSuccess else {
            throw KeychainFailure(status: interactionSuppressionStatus ?? errSecInternalComponent)
        }
    }

    func read() throws -> String? {
        try prepareWithoutPrompts()
        var lookup = query
        lookup[kSecReturnData as String] = true
        lookup[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(lookup as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw KeychainFailure(status: status) }
        guard let data = result as? Data, let value = String(data: data, encoding: .utf8) else {
            throw KeychainFailure(status: errSecDecode)
        }
        let key = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return key.isEmpty ? nil : key
    }

    func save(_ value: String) throws {
        let key = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else { throw KeychainFailure(status: errSecParam) }
        try prepareWithoutPrompts()
        let attributes = [kSecValueData as String: Data(key.utf8)]
        var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var entry = query
            entry[kSecValueData as String] = Data(key.utf8)
            entry[kSecAttrLabel as String] = "QuizFlash OpenAI API Key"
            status = SecItemAdd(entry as CFDictionary, nil)
        }
        guard status == errSecSuccess else { throw KeychainFailure(status: status) }
    }

    func delete() throws {
        try prepareWithoutPrompts()
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainFailure(status: status)
        }
    }

    struct KeychainFailure: LocalizedError {
        let status: OSStatus
        var errorDescription: String? {
            switch status {
            case errSecInteractionNotAllowed, errSecAuthFailed:
                return "Keychain 인증이 필요해 접근하지 못했습니다 (\(status)). 인증창은 열지 않습니다. 키체인을 직접 잠금 해제하거나 OPENAI_API_KEY를 사용하세요."
            case errSecDecode:
                return "저장된 API 키를 읽을 수 없습니다 (\(status)). 키를 다시 저장하세요."
            default:
                return "Keychain 오류 (\(status)). OPENAI_API_KEY 환경변수로도 사용할 수 있습니다."
            }
        }
    }
}

@MainActor
final class AppSettings: ObservableObject {
    static let defaultModel = "gpt-5.6-luna"
    private let defaults: UserDefaults
    private let environmentKey: String?
    private var storedKey: String?
    private var keyRevision = 0

    @Published private(set) var pdfKnowledge: PDFKnowledge? {
        didSet {
            if let pdfKnowledge, let data = try? JSONEncoder().encode(pdfKnowledge) {
                defaults.set(data, forKey: "pdfKnowledge")
            } else {
                defaults.removeObject(forKey: "pdfKnowledge")
            }
        }
    }
    @Published private(set) var pdfStatus = "등록된 PDF 없음"
    @Published private(set) var isRegisteringPDF = false

    @Published var modelName: String {
        didSet { defaults.set(modelName, forKey: "modelName") }
    }
    @Published var showLatency: Bool {
        didSet { defaults.set(showLatency, forKey: "showLatency") }
    }
    @Published var region: CaptureRegion? {
        didSet {
            if let region, let data = try? JSONEncoder().encode(region) {
                defaults.set(data, forKey: "captureRegion")
            } else {
                defaults.removeObject(forKey: "captureRegion")
            }
        }
    }
    @Published private(set) var keyStatus = "키 확인 중…"
    @Published private(set) var isSavingKey = false

    var apiKey: String? { environmentKey ?? storedKey }
    var usesEnvironmentKey: Bool { environmentKey != nil }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        let key = ProcessInfo.processInfo.environment["OPENAI_API_KEY"]?.trimmingCharacters(in: .whitespacesAndNewlines)
        environmentKey = key.flatMap { $0.isEmpty ? nil : $0 }
        let model = defaults.string(forKey: "modelName")?.trimmingCharacters(in: .whitespacesAndNewlines)
        modelName = model.flatMap { $0.isEmpty ? nil : $0 } ?? Self.defaultModel
        showLatency = defaults.bool(forKey: "showLatency")
        if let data = defaults.data(forKey: "captureRegion") {
            region = try? JSONDecoder().decode(CaptureRegion.self, from: data)
        }
        if let data = defaults.data(forKey: "pdfKnowledge"),
           let knowledge = try? JSONDecoder().decode(PDFKnowledge.self, from: data) {
            pdfKnowledge = knowledge
            pdfStatus = "PDF 사용 중: \(knowledge.fileName)"
        }
    }

    func loadKey() async {
        if usesEnvironmentKey {
            keyStatus = "OPENAI_API_KEY 환경변수 사용 중"
            return
        }
        let revision = keyRevision
        do {
            let key = try await APIKeychain.shared.read()
            guard keyRevision == revision else { return }
            storedKey = key.flatMap { $0.isEmpty ? nil : $0 }
            keyStatus = storedKey == nil ? "API 키를 입력하세요." : "Keychain 키 사용 중"
        } catch {
            guard keyRevision == revision else { return }
            keyStatus = error.localizedDescription
        }
    }

    func saveKey(_ value: String) async -> Bool {
        let key = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty, !isSavingKey else { return false }
        keyRevision += 1
        isSavingKey = true
        defer { isSavingKey = false }
        do {
            try await APIKeychain.shared.save(key)
            storedKey = key
            keyStatus = usesEnvironmentKey ? "Keychain 저장 완료 · 환경변수가 우선 적용됩니다." : "Keychain 저장 완료"
            return true
        } catch {
            keyStatus = error.localizedDescription
            return false
        }
    }

    func deleteKey() async {
        guard !isSavingKey else { return }
        keyRevision += 1
        isSavingKey = true
        defer { isSavingKey = false }
        do {
            try await APIKeychain.shared.delete()
            storedKey = nil
            keyStatus = usesEnvironmentKey ? "Keychain 키 삭제 완료 · 환경변수 사용 중" : "저장된 키를 삭제했습니다."
        } catch {
            keyStatus = error.localizedDescription
        }
    }

    func beginPDFRegistration() -> Bool {
        guard !isRegisteringPDF else { return false }
        isRegisteringPDF = true
        pdfStatus = "PDF 업로드 및 색인 중…"
        return true
    }

    func finishPDFRegistration(_ knowledge: PDFKnowledge) {
        pdfKnowledge = knowledge
        pdfStatus = "PDF 사용 중: \(knowledge.fileName)"
        isRegisteringPDF = false
    }

    func failPDFRegistration(_ message: String) {
        pdfStatus = "PDF 등록 실패: \(message)"
        isRegisteringPDF = false
    }

    func clearPDFKnowledge() -> PDFKnowledge? {
        let old = pdfKnowledge
        pdfKnowledge = nil
        pdfStatus = "등록된 PDF 없음"
        isRegisteringPDF = false
        return old
    }
}

private struct SettingsView: View {
    @ObservedObject var settings: AppSettings
    @ObservedObject var latency: LatencyTracker
    var selectRegion: () -> Void
    var requestPermission: () -> Void
    var selectPDF: () -> Void
    var removePDF: () -> Void
    @State private var newKey = ""
    @State private var modelDraft: String

    init(settings: AppSettings, latency: LatencyTracker,
         selectRegion: @escaping () -> Void, requestPermission: @escaping () -> Void,
         selectPDF: @escaping () -> Void, removePDF: @escaping () -> Void) {
        self.settings = settings
        self.latency = latency
        self.selectRegion = selectRegion
        self.requestPermission = requestPermission
        self.selectPDF = selectPDF
        self.removePDF = removePDF
        _modelDraft = State(initialValue: settings.modelName)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("QuizFlash").font(.title2.bold())
            Text("문제 + 보기 4개를 지정한 후 ⌥ Space").foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 8) {
                Text("OpenAI API Key").font(.headline)
                SecureField("새 API 키", text: $newKey)
                HStack {
                    Button("Keychain에 저장") {
                        Task { if await settings.saveKey(newKey) { newKey = "" } }
                    }
                    .disabled(newKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || settings.isSavingKey)
                    Button("저장된 키 삭제") { Task { await settings.deleteKey() } }
                        .disabled(settings.isSavingKey)
                }
                Text(settings.keyStatus).font(.caption).foregroundStyle(.secondary)
            }

            HStack {
                Text("Model")
                TextField(AppSettings.defaultModel, text: $modelDraft)
                Button("적용") { settings.modelName = modelDraft.trimmingCharacters(in: .whitespacesAndNewlines) }
                    .disabled(modelDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            Text(settings.pdfKnowledge == nil ? "Mode: Image Only · Reasoning: none" : "Mode: Image + PDF · Reasoning: none")
                .font(.caption).foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 8) {
                Text("참고 PDF").font(.headline)
                HStack {
                    Button(settings.pdfKnowledge == nil ? "PDF 등록…" : "PDF 교체…") { selectPDF() }
                        .disabled(settings.isRegisteringPDF)
                    Button("PDF 해제") { removePDF() }
                        .disabled(settings.pdfKnowledge == nil || settings.isRegisteringPDF)
                }
                if settings.isRegisteringPDF { ProgressView().controlSize(.small) }
                Text(settings.pdfStatus).font(.caption).foregroundStyle(.secondary)
                Text("PDF는 OpenAI에 업로드되어 30일간 사용하지 않으면 색인이 만료됩니다.")
                    .font(.caption).foregroundStyle(.secondary)
            }

            Divider()
            HStack {
                Button("화면 캡처 권한 허용") { requestPermission() }
                Button("Set Capture Region") { selectRegion() }
            }
            if let region = settings.region {
                Text("저장된 영역: \(Int(region.rect.width)) × \(Int(region.rect.height)) pt")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Text("타이머를 제외하고 문제와 보기 4개만 드래그하세요. 선택한 영역의 이미지는 답 요청 시 OpenAI로 전송됩니다.")
                .font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)

            Toggle("Show Latency", isOn: $settings.showLatency)
            if let average = latency.average, let last = latency.samples.last {
                Text("최근 \(latency.samples.count)건 평균: \(Int(average)) ms · 마지막: \(Int(last.total)) ms")
                    .font(.caption).monospacedDigit()
            } else {
                Text("성공한 요청 후 지연시간이 표시됩니다.").font(.caption).foregroundStyle(.secondary)
            }
            Text("수업·퀴즈 서비스에서 허용하는 범위에서 사용하세요. 답안은 직접 클릭합니다.")
                .font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
        }
        .textFieldStyle(.roundedBorder)
        .padding(22)
        .frame(width: 480)
    }
}

@MainActor
final class SettingsController {
    private var panel: NSPanel?

    func show(settings: AppSettings, latency: LatencyTracker,
              selectRegion: @escaping () -> Void, requestPermission: @escaping () -> Void,
              selectPDF: @escaping () -> Void, removePDF: @escaping () -> Void) {
        if let panel { panel.orderFrontRegardless(); return }
        let panel = SettingsPanel(contentRect: NSRect(x: 0, y: 0, width: 480, height: 650),
                                  styleMask: [.titled, .closable, .nonactivatingPanel],
                                  backing: .buffered, defer: false)
        panel.title = "QuizFlash Settings"
        panel.isReleasedWhenClosed = false
        panel.hidesOnDeactivate = false
        panel.becomesKeyOnlyIfNeeded = true
        panel.animationBehavior = .none
        panel.contentView = NSHostingView(rootView: SettingsView(settings: settings, latency: latency,
                                                               selectRegion: selectRegion, requestPermission: requestPermission,
                                                               selectPDF: selectPDF, removePDF: removePDF))
        panel.center()
        self.panel = panel
        // Explicit clicks into fields can edit; simply opening this panel never activates the app.
        panel.orderFrontRegardless()
    }

    func hide() { panel?.orderOut(nil) }
}

private final class SettingsPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}
