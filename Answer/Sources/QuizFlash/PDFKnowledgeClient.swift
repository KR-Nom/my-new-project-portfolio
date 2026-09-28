/*
 작성자: 장현진 / Codex
 작성일: 2026-09-18
 변경사항: PDF 업로드, Vector Store 생성·색인 대기·원격 정리 기능 추가.
 프로그램 설명: 한 번 등록한 PDF를 Responses file_search에서 재사용한다.
 실행 방법: Settings에서 PDF 등록 버튼을 사용한다.
 */

import Foundation

struct PDFKnowledge: Codable, Equatable, Sendable {
    let fileID: String
    let vectorStoreID: String
    let fileName: String
}

enum PDFKnowledgeError: Error, LocalizedError, Equatable {
    case invalidPDF
    case missingKey
    case http(Int)
    case invalidResponse
    case indexingFailed
    case indexingTimedOut
    case network(Int)

    var errorDescription: String? {
        switch self {
        case .invalidPDF: return "PDF 파일을 읽을 수 없거나 올바른 PDF가 아닙니다."
        case .missingKey: return "PDF 등록 전에 OpenAI API 키를 저장하세요."
        case .http(let status): return "PDF 등록 API 오류 (HTTP \(status)). 키, 사용 한도와 파일 크기를 확인하세요."
        case .invalidResponse: return "PDF 등록 API가 올바르지 않은 응답을 반환했습니다."
        case .indexingFailed: return "PDF 색인에 실패했습니다. 텍스트가 포함된 PDF인지 확인하세요."
        case .indexingTimedOut: return "PDF 색인이 제한 시간 안에 끝나지 않았습니다. 잠시 후 다시 등록하세요."
        case .network(let code): return "PDF 등록 네트워크 오류 (URL error \(code))."
        }
    }
}

actor PDFKnowledgeClient {
    private let session: URLSession

    init(configuration: URLSessionConfiguration = .ephemeral) {
        configuration.urlCache = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.httpCookieStorage = nil
        configuration.urlCredentialStorage = nil
        configuration.timeoutIntervalForRequest = 60
        configuration.timeoutIntervalForResource = 180
        configuration.waitsForConnectivity = false
        session = URLSession(configuration: configuration)
    }

    deinit { session.invalidateAndCancel() }

    func register(pdfData: Data, fileName: String, apiKey: String) async throws -> PDFKnowledge {
        let key = try validatedKey(apiKey)
        guard pdfData.count >= 5, pdfData.starts(with: Data("%PDF-".utf8)) else {
            throw PDFKnowledgeError.invalidPDF
        }
        let safeName = fileName.isEmpty ? "reference.pdf" : fileName
        let fileID = try await upload(pdfData: pdfData, fileName: safeName, apiKey: key)
        do {
            let vectorStoreID = try await createVectorStore(fileID: fileID, fileName: safeName, apiKey: key)
            do {
                try await waitUntilReady(vectorStoreID: vectorStoreID, apiKey: key)
                return PDFKnowledge(fileID: fileID, vectorStoreID: vectorStoreID, fileName: safeName)
            } catch {
                try? await delete(path: "/v1/vector_stores/\(vectorStoreID)", apiKey: key)
                throw error
            }
        } catch {
            try? await delete(path: "/v1/files/\(fileID)", apiKey: key)
            throw error
        }
    }

    func remove(_ knowledge: PDFKnowledge, apiKey: String) async {
        guard let key = try? validatedKey(apiKey) else { return }
        try? await delete(path: "/v1/vector_stores/\(knowledge.vectorStoreID)", apiKey: key)
        try? await delete(path: "/v1/files/\(knowledge.fileID)", apiKey: key)
    }

    nonisolated static func makeUploadRequest(pdfData: Data, fileName: String, apiKey: String,
                                              boundary: String) throws -> URLRequest {
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty, key.utf8.allSatisfy({ (33...126).contains($0) }) else {
            throw PDFKnowledgeError.missingKey
        }
        let escapedName = fileName.replacingOccurrences(of: "\"", with: "_")
            .replacingOccurrences(of: "\r", with: "_").replacingOccurrences(of: "\n", with: "_")
        var body = Data()
        body.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"purpose\"\r\n\r\nuser_data\r\n".utf8))
        body.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"file\"; filename=\"\(escapedName)\"\r\nContent-Type: application/pdf\r\n\r\n".utf8))
        body.append(pdfData)
        body.append(Data("\r\n--\(boundary)--\r\n".utf8))

        var request = URLRequest(url: URL(string: "https://api.openai.com/v1/files")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        return request
    }

    private func upload(pdfData: Data, fileName: String, apiKey: String) async throws -> String {
        let request = try Self.makeUploadRequest(pdfData: pdfData, fileName: fileName, apiKey: apiKey,
                                                 boundary: "QuizFlash-\(UUID().uuidString)")
        let object = try await json(for: request)
        guard let id = object["id"] as? String, id.hasPrefix("file-") else {
            throw PDFKnowledgeError.invalidResponse
        }
        return id
    }

    private func createVectorStore(fileID: String, fileName: String, apiKey: String) async throws -> String {
        var request = try jsonRequest(path: "/v1/vector_stores", method: "POST", apiKey: apiKey)
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "name": "QuizFlash · \(fileName)",
            "file_ids": [fileID],
            "expires_after": ["anchor": "last_active_at", "days": 30]
        ])
        let object = try await json(for: request)
        guard let id = object["id"] as? String, id.hasPrefix("vs_") else {
            throw PDFKnowledgeError.invalidResponse
        }
        return id
    }

    private func waitUntilReady(vectorStoreID: String, apiKey: String) async throws {
        for _ in 0..<90 {
            try Task.checkCancellation()
            let request = try jsonRequest(path: "/v1/vector_stores/\(vectorStoreID)", method: "GET", apiKey: apiKey)
            let object = try await json(for: request)
            let status = object["status"] as? String
            let counts = object["file_counts"] as? [String: Any]
            if status == "completed", (counts?["completed"] as? Int ?? 0) >= 1 { return }
            if status == "expired" || (counts?["failed"] as? Int ?? 0) > 0 { throw PDFKnowledgeError.indexingFailed }
            try await Task.sleep(for: .seconds(1))
        }
        throw PDFKnowledgeError.indexingTimedOut
    }

    private func delete(path: String, apiKey: String) async throws {
        let request = try jsonRequest(path: path, method: "DELETE", apiKey: apiKey)
        _ = try await json(for: request)
    }

    private func jsonRequest(path: String, method: String, apiKey: String) throws -> URLRequest {
        guard let url = URL(string: "https://api.openai.com\(path)") else { throw PDFKnowledgeError.invalidResponse }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return request
    }

    private func json(for request: URLRequest) async throws -> [String: Any] {
        do {
            let (data, response) = try await session.data(for: request)
            try Task.checkCancellation()
            guard let http = response as? HTTPURLResponse else { throw PDFKnowledgeError.invalidResponse }
            guard (200...299).contains(http.statusCode) else { throw PDFKnowledgeError.http(http.statusCode) }
            guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                throw PDFKnowledgeError.invalidResponse
            }
            return object
        } catch let error as PDFKnowledgeError { throw error }
        catch is CancellationError { throw CancellationError() }
        catch {
            let nsError = error as NSError
            throw PDFKnowledgeError.network(nsError.code)
        }
    }

    private func validatedKey(_ apiKey: String) throws -> String {
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty, key.utf8.allSatisfy({ (33...126).contains($0) }) else {
            throw PDFKnowledgeError.missingKey
        }
        return key
    }
}
