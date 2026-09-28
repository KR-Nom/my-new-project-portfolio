/*
 '''
 작성자: 장현진 / Codex
 작성일: 2026-09-17
 변경사항: Responses API 이미지 스트리밍, 즉시 취소, 메모리 전용 세션 구현.
 프로그램: 출력 텍스트에서 첫 정답 숫자가 도착하면 즉시 반환한다.
 실행 방법: QuizFlash의 Option + Space 또는 Ask Now.
 '''
 */

import Foundation

struct OpenAIAnswer: Sendable {
    let digit: Int?
    let requestStarted: ContinuousClock.Instant
    let answerReceived: ContinuousClock.Instant
}

enum OpenAIClientError: Error, LocalizedError, Equatable {
    case missingKey
    case http(Int)
    case apiFailure
    case network(Int)
    case invalidResponse

    var overlayCode: String {
        switch self {
        case .missingKey, .http(401), .http(403): return "KEY"
        case .http, .apiFailure: return "API"
        case .network: return "NET"
        case .invalidResponse: return "?"
        }
    }

    var errorDescription: String? {
        // Server bodies and URL error descriptions can contain private inputs.
        switch self {
        case .missingKey: return "OpenAI API key is missing or contains invalid characters."
        case .http(let status): return "OpenAI HTTP status \(status). Check key, model access, quota, and model settings."
        case .apiFailure: return "OpenAI reported a failed response. Check model access and quota."
        case .network(let code): return "OpenAI network request failed (URL error \(code))."
        case .invalidResponse: return "OpenAI returned an invalid response or stream format."
        }
    }
}

actor OpenAIClient {
    private let session: URLSession

    init(configuration: URLSessionConfiguration = .ephemeral) {
        configuration.urlCache = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.httpCookieStorage = nil
        configuration.urlCredentialStorage = nil
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 45
        configuration.waitsForConnectivity = false
        session = URLSession(configuration: configuration)
    }

    deinit { session.invalidateAndCancel() }

    func ask(jpeg: Data, apiKey: String, model: String, vectorStoreID: String? = nil) async throws -> OpenAIAnswer {
        try Task.checkCancellation()
        // Actor isolation keeps base64 and JSON encoding away from the UI thread.
        let request = try Self.makeRequest(jpeg: jpeg, apiKey: apiKey, model: model,
                                           vectorStoreID: vectorStoreID)
        try Task.checkCancellation()
        let requestStarted = ContinuousClock.now
        let arrival = try await ResponseStream().answer(session: session, request: request)
        try Task.checkCancellation()
        return OpenAIAnswer(digit: arrival.digit, requestStarted: requestStarted,
                            answerReceived: arrival.received)
    }

    nonisolated static func parseDigit(_ text: String) -> Int? {
        text.utf8.first(where: { (49...52).contains($0) }).map { Int($0 - 48) }
    }

    nonisolated static func makeRequest(jpeg: Data, apiKey: String, model: String,
                                        vectorStoreID: String? = nil) throws -> URLRequest {
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty, key.utf8.allSatisfy({ (33...126).contains($0) }) else {
            throw OpenAIClientError.missingKey
        }
        guard !jpeg.isEmpty, !model.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw OpenAIClientError.invalidResponse
        }
        let knowledgeEnabled = vectorStoreID?.hasPrefix("vs_") == true
        let instructions = knowledgeEnabled ? """
            You are solving a four-choice quiz from a screenshot.
            You MUST search the registered reference PDF before answering.
            Treat the PDF as the primary source. Use general knowledge only when the PDF has no relevant evidence.
            Determine the single best answer. Choices are ordered from top to bottom as 1,2,3,4.
            Return ONLY one ASCII digit: 1, 2, 3, or 4.
            Do not output explanations, punctuation, markdown, or any other text.
            """ : """
            You are solving a four-choice quiz from a screenshot.
            Determine the single best answer.
            Choices are ordered from top to bottom as 1,2,3,4.
            Return ONLY one ASCII digit: 1, 2, 3, or 4.
            Do not output explanations, punctuation, markdown, or any other text.
            """
        var body: [String: Any] = [
            "model": model,
            "instructions": instructions,
            "input": [["role": "user", "content": [
                ["type": "input_image", "image_url": "data:image/jpeg;base64,\(jpeg.base64EncodedString())",
                 "detail": "high"]
            ]]],
            "reasoning": ["effort": "none"],
            // Hosted file_search may consume output budget before the final one-digit answer.
            // Keep the fast image-only path tight, but leave PDF mode enough room to finish.
            "max_output_tokens": knowledgeEnabled ? 128 : 16,
            "stream": true,
            "store": false
        ]
        if let vectorStoreID, knowledgeEnabled {
            body["tools"] = [["type": "file_search", "vector_store_ids": [vectorStoreID],
                              "max_num_results": 8]]
        }
        var request = URLRequest(url: URL(string: "https://api.openai.com/v1/responses")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return request
    }
}

/// Incremental SSE framing. A network chunk may split a line or a UTF-8 character.
struct SSEDecoder {
    private var buffer = Data()
    private var dataLines: [String] = []
    private var eventBytes = 0

    mutating func append(_ bytes: Data) throws -> [String] {
        buffer.append(bytes)
        guard buffer.count + eventBytes <= 1_048_576 else { throw OpenAIClientError.invalidResponse }
        var events: [String] = []
        var cursor = buffer.startIndex
        while let newline = buffer[cursor...].firstIndex(of: 10) {
            try consume(buffer[cursor..<newline], into: &events)
            cursor = buffer.index(after: newline)
        }
        buffer.removeSubrange(buffer.startIndex..<cursor)
        return events
    }

    mutating func finish() throws -> [String] {
        var events: [String] = []
        if !buffer.isEmpty { try consume(buffer[...], into: &events) }
        buffer.removeAll(keepingCapacity: false)
        flush(into: &events)
        return events
    }

    private mutating func consume(_ bytes: Data.SubSequence, into events: inout [String]) throws {
        let lineBytes = bytes.last == 13 ? bytes.dropLast() : bytes
        guard let line = String(data: lineBytes, encoding: .utf8) else { throw OpenAIClientError.invalidResponse }
        if line.isEmpty {
            flush(into: &events)
        } else if line == "data" {
            dataLines.append("")
        } else if line.hasPrefix("data:") {
            let value = line.dropFirst(5)
            dataLines.append(String(value.first == " " ? value.dropFirst() : value))
            eventBytes += lineBytes.count
        }
    }

    private mutating func flush(into events: inout [String]) {
        if !dataLines.isEmpty { events.append(dataLines.joined(separator: "\n")) }
        dataLines.removeAll(keepingCapacity: true)
        eventBytes = 0
    }
}

enum ResponseStreamEvent: Equatable {
    case answer(Int)
    case finished
    case failure(OpenAIClientError)
    case ignored

    static func parse(_ data: String) -> Self {
        if data == "[DONE]" { return .finished }
        guard let bytes = data.data(using: .utf8),
              let event = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
              let type = event["type"] as? String else { return .failure(.invalidResponse) }

        switch type {
        case "response.output_text.delta":
            guard let delta = event["delta"] as? String else { return .failure(.invalidResponse) }
            return OpenAIClient.parseDigit(delta).map(Self.answer) ?? .ignored
        case "response.output_text.done":
            guard let text = event["text"] as? String else { return .failure(.invalidResponse) }
            return OpenAIClient.parseDigit(text).map(Self.answer) ?? .ignored
        case "response.completed", "response.incomplete":
            guard let response = event["response"] as? [String: Any] else { return .failure(.invalidResponse) }
            if let output = response["output"] as? [[String: Any]] {
                for item in output where item["type"] as? String == "message" {
                    for content in item["content"] as? [[String: Any]] ?? []
                        where content["type"] as? String == "output_text" {
                        if let text = content["text"] as? String, let digit = OpenAIClient.parseDigit(text) {
                            return .answer(digit)
                        }
                    }
                }
            }
            return .finished
        case "response.refusal.delta", "response.refusal.done": return .finished
        case "error", "response.failed": return .failure(.apiFailure)
        default: return .ignored // Never extract numbers from reasoning, IDs, or metadata.
        }
    }
}

private struct AnswerArrival {
    let digit: Int?
    let received: ContinuousClock.Instant
}

/// Per-request delegate; the URLSession and its connection pool stay alive across requests.
private final class ResponseStream: NSObject, URLSessionDataDelegate, @unchecked Sendable {
    private let lock = NSLock()
    private var continuation: CheckedContinuation<AnswerArrival, Error>?
    private var result: Result<AnswerArrival, Error>?
    private var task: URLSessionDataTask?
    private var decoder = SSEDecoder() // Only accessed on the session's serial delegate queue.

    func answer(session: URLSession, request: URLRequest) async throws -> AnswerArrival {
        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                lock.lock()
                if let result {
                    lock.unlock()
                    continuation.resume(with: result)
                    return
                }
                self.continuation = continuation
                let task = session.dataTask(with: request)
                self.task = task
                task.delegate = self
                task.resume()
                lock.unlock()
            }
        } onCancel: {
            self.finish(.failure(CancellationError()))
        }
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask,
                    didReceive response: URLResponse,
                    completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        guard let http = response as? HTTPURLResponse else {
            completionHandler(.cancel)
            finish(.failure(OpenAIClientError.invalidResponse))
            return
        }
        guard (200...299).contains(http.statusCode) else {
            completionHandler(.cancel)
            finish(.failure(OpenAIClientError.http(http.statusCode)))
            return
        }
        guard http.mimeType?.lowercased() == "text/event-stream" else {
            completionHandler(.cancel)
            finish(.failure(OpenAIClientError.invalidResponse))
            return
        }
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        do { consume(try decoder.append(data)) }
        catch { finish(.failure(OpenAIClientError.invalidResponse)) }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error {
            let urlError = error as NSError
            if urlError.domain == NSURLErrorDomain, urlError.code == NSURLErrorCancelled {
                finish(.failure(CancellationError()))
            } else {
                finish(.failure(OpenAIClientError.network(urlError.code)))
            }
            return
        }
        do {
            consume(try decoder.finish())
            finish(.success(AnswerArrival(digit: nil, received: .now)))
        } catch { finish(.failure(OpenAIClientError.invalidResponse)) }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
                    completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil) // Keep credentials and screenshots on the fixed API endpoint.
        finish(.failure(OpenAIClientError.http(response.statusCode)))
    }

    private func consume(_ events: [String]) {
        for event in events {
            switch ResponseStreamEvent.parse(event) {
            case .answer(let digit):
                finish(.success(AnswerArrival(digit: digit, received: .now)))
                return
            case .finished:
                finish(.success(AnswerArrival(digit: nil, received: .now)))
                return
            case .failure(let error):
                finish(.failure(error))
                return
            case .ignored: continue
            }
        }
    }

    private func finish(_ result: Result<AnswerArrival, Error>) {
        lock.lock()
        guard self.result == nil else { lock.unlock(); return }
        self.result = result
        let continuation = self.continuation
        let task = self.task
        self.continuation = nil
        self.task = nil
        lock.unlock()
        task?.cancel() // Stop upstream output immediately, including while awaiting headers.
        continuation?.resume(with: result)
    }
}
