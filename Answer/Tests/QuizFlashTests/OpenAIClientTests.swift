/*
 '''
 작성자: 장현진 / Codex
 작성일: 2026-09-17
 변경사항: Swift Testing으로 숫자·SSE 파싱, API 형식, 취소와 오류를 검증.
 프로그램: 실제 API나 화면 전송 없이 URLProtocol로 검증한다.
 실행 방법: scripts/test.sh
 '''
 */

import Foundation
import Testing
@testable import QuizFlash

@Suite(.serialized)
final class OpenAIClientTests {
    deinit {
        StubURLProtocol.configure { _ in Issue.record("Unexpected request after test finished") }
    }

    @Test func parsesOnlyFirstASCIIDigitBetweenOneAndFour() {
        for (text, expected) in [("1", 1), ("2\n", 2), ("The answer is 3", 3),
                                 ("4.", 4), ("2, then 1", 2)] {
            #expect(OpenAIClient.parseDigit(text) == expected)
        }
        for text in ["invalid", "", "0 5 6 7 8 9", "① ② ③ ④", "１ ２ ３ ４"] {
            #expect(OpenAIClient.parseDigit(text) == nil)
        }
    }

    @Test func sseDecodesFragmentedUTF8CRLFAndMultipleDataLines() throws {
        let input = ": keepalive\r\nevent: response.output_text.delta\r\n"
            + "data: {\"type\":\"response.output_text.delta\",\r\n"
            + "data: \"delta\":\"정답 3\"}\r\n\r\n"
        var decoder = SSEDecoder()
        var events: [String] = []
        for byte in input.utf8 { events += try decoder.append(Data([byte])) }
        #expect(events.count == 1)
        let event = try #require(events.first)
        #expect(ResponseStreamEvent.parse(event) == .answer(3))
    }

    @Test func sseFlushesFinalLineAtEOF() throws {
        var decoder = SSEDecoder()
        #expect(try decoder.append(Data("data: [DONE]".utf8)) == [])
        #expect(try decoder.finish() == ["[DONE]"])
    }

    @Test func onlyOutputTextCanProduceAnswers() {
        for event in [
            #"{"type":"response.reasoning_text.delta","delta":"The answer is 1"}"#,
            #"{"type":"response.created","response":{"id":"resp_1234"}}"#,
            #"{"type":"response.output_item.added","output_index":2,"item":{"id":"msg_4"}}"#
        ] { #expect(ResponseStreamEvent.parse(event) == .ignored) }
        #expect(ResponseStreamEvent.parse(#"{"type":"response.output_text.delta","delta":"4"}"#) == .answer(4))
        #expect(ResponseStreamEvent.parse(#"{"type":"response.output_text.done","text":"2\n"}"#) == .answer(2))
    }

    @Test func completedResponseReadsNestedOutputTextAndIgnoresReasoning() {
        let event = #"{"type":"response.completed","response":{"output":[{"type":"reasoning","summary":[{"type":"summary_text","text":"1"}]},{"type":"message","content":[{"type":"output_text","text":"3"}]}]}}"#
        #expect(ResponseStreamEvent.parse(event) == .answer(3))
        #expect(ResponseStreamEvent.parse(#"{"type":"response.completed","response":{"output":[]}}"#) == .finished)
    }

    @Test func refusalIncompleteAndFailedEventsNeverExtractErrorDigits() {
        #expect(ResponseStreamEvent.parse(#"{"type":"response.refusal.delta","delta":"I cannot answer 4"}"#) == .finished)
        #expect(ResponseStreamEvent.parse(#"{"type":"response.incomplete","response":{"output":[],"incomplete_details":{"reason":"max_output_tokens"}}}"#) == .finished)
        #expect(ResponseStreamEvent.parse(#"{"type":"response.failed","response":{"error":{"message":"Error 429"}}}"#) == .failure(.apiFailure))
        #expect(ResponseStreamEvent.parse(#"{"type":"error","message":"Error 401"}"#) == .failure(.apiFailure))
        #expect(ResponseStreamEvent.parse("not JSON 3") == .failure(.invalidResponse))
    }

    @Test func requestUsesResponsesImageSchemaAndPrivacySettings() throws {
        let jpeg = Data([0xff, 0xd8, 0xff])
        let request = try OpenAIClient.makeRequest(jpeg: jpeg, apiKey: "test-placeholder", model: "gpt-5.6-luna")
        #expect(request.url?.absoluteString == "https://api.openai.com/v1/responses")
        #expect(request.httpMethod == "POST")
        #expect(request.value(forHTTPHeaderField: "Authorization") == "Bearer test-placeholder")
        let requestBody = try #require(request.httpBody)
        let body = try #require(JSONSerialization.jsonObject(with: requestBody) as? [String: Any])
        #expect(body["model"] as? String == "gpt-5.6-luna")
        #expect(body["stream"] as? Bool == true)
        #expect(body["store"] as? Bool == false)
        #expect(body["max_output_tokens"] as? Int == 16)
        #expect((body["reasoning"] as? [String: String])?["effort"] == "none")
        let input = try #require(body["input"] as? [[String: Any]])
        let image = try #require((input.first?["content"] as? [[String: String]])?.first)
        #expect(image["type"] == "input_image")
        #expect(image["detail"] == "high")
        #expect(image["image_url"] == "data:image/jpeg;base64,\(jpeg.base64EncodedString())")
    }

    @Test func registeredPDFAddsFileSearchToolAndPDFPriorityInstructions() throws {
        let request = try OpenAIClient.makeRequest(jpeg: Data([1]), apiKey: "test-placeholder",
                                                   model: "gpt-5.6-luna", vectorStoreID: "vs_test")
        let requestBody = try #require(request.httpBody)
        let body = try #require(JSONSerialization.jsonObject(with: requestBody) as? [String: Any])
        let tools = try #require(body["tools"] as? [[String: Any]])
        #expect(tools.first?["type"] as? String == "file_search")
        #expect(tools.first?["vector_store_ids"] as? [String] == ["vs_test"])
        #expect((body["instructions"] as? String)?.contains("MUST search") == true)
        #expect(body["max_output_tokens"] as? Int == 128)
    }

    @Test func PDFUploadUsesUserDataMultipartWithoutChangingFileBytes() throws {
        let pdf = Data("%PDF-test-content".utf8)
        let request = try PDFKnowledgeClient.makeUploadRequest(pdfData: pdf, fileName: "lecture.pdf",
                                                               apiKey: "test-placeholder", boundary: "Boundary")
        #expect(request.url?.absoluteString == "https://api.openai.com/v1/files")
        #expect(request.value(forHTTPHeaderField: "Content-Type") == "multipart/form-data; boundary=Boundary")
        let body = try #require(request.httpBody)
        #expect(body.range(of: Data("name=\"purpose\"\r\n\r\nuser_data".utf8)) != nil)
        #expect(body.range(of: Data("filename=\"lecture.pdf\"".utf8)) != nil)
        #expect(body.range(of: pdf) != nil)
    }

    @Test func emptyOrMalformedKeyIsRejectedBeforeNetwork() {
        for key in ["", "  \n", "key\nInjected: value", "한글"] {
            #expect(throws: OpenAIClientError.missingKey) {
                try OpenAIClient.makeRequest(jpeg: Data([1]), apiKey: key, model: "gpt-5.6-luna")
            }
        }
    }

    @Test func firstUsableDigitReturnsBeforeStreamCompletesAndStopsTask() async throws {
        try await confirmation("Stream cancelled after first digit") { stopped in
            let stoppedSignal = NetworkTestSignal()
            StubURLProtocol.configure(onStop: { stopped(); stoppedSignal.send() }) { stub in
                stub.respond()
                stub.send(#"data: {"type":"response.reasoning_text.delta","delta":"1"}"# + "\n\n")
                stub.send(#"data: {"type":"response.output_text.delta","delta":"3"}"# + "\n\n")
                // No completion is delivered. The client must return and cancel now.
            }
            let answer = try await requestAnswer()
            #expect(answer.digit == 3)
            #expect(answer.answerReceived >= answer.requestStarted)
            try await stoppedSignal.wait()
        }
    }

    @Test func cancellationWhileAwaitingHeadersStopsNetwork() async throws {
        try await confirmation("Underlying request cancelled") { stopped in
            let startedSignal = NetworkTestSignal()
            let stoppedSignal = NetworkTestSignal()
            StubURLProtocol.configure(onStop: { stopped(); stoppedSignal.send() }) { _ in startedSignal.send() }
            let client = makeClient()
            let request = Task { try await client.ask(jpeg: Data([1]), apiKey: "test-placeholder", model: "gpt-5.6-luna") }
            defer { request.cancel() }
            try await startedSignal.wait()
            request.cancel()
            do {
                _ = try await withNetworkTestTimeout { try await request.value }
                Issue.record("Cancelled request should throw")
            } catch is CancellationError {} catch { throw error }
            try await stoppedSignal.wait()
        }
    }

    @Test func httpFailuresUseShortCodesWithoutLoggingServerBody() async throws {
        for (status, expectedCode) in [(401, "KEY"), (403, "KEY"), (429, "API"), (500, "API")] {
            StubURLProtocol.configure { stub in stub.respond(status: status) }
            do {
                _ = try await requestAnswer()
                Issue.record("HTTP failure should throw")
            } catch let error as OpenAIClientError {
                #expect(error == .http(status))
                #expect(error.overlayCode == expectedCode)
            }
        }
    }

    @Test func networkErrorIsSanitized() async throws {
        StubURLProtocol.configure { stub in
            stub.client?.urlProtocol(stub, didFailWithError: NSError(domain: NSURLErrorDomain,
                code: NSURLErrorTimedOut, userInfo: [NSLocalizedDescriptionKey: "private screenshot and credential"]))
        }
        do {
            _ = try await requestAnswer()
            Issue.record("Network failure should throw")
        } catch let error as OpenAIClientError {
            #expect(error == .network(NSURLErrorTimedOut))
            #expect(error.overlayCode == "NET")
            #expect(!error.localizedDescription.contains("private screenshot"))
        }
    }

    @Test func noDigitReturnsNilForCoordinatorToRetry() async throws {
        StubURLProtocol.configure { stub in
            stub.respond()
            stub.send(#"data: {"type":"response.output_text.delta","delta":"invalid"}"# + "\n\n")
            stub.send(#"data: {"type":"response.completed","response":{"output":[]}}"# + "\n\n")
        }
        let answer = try await requestAnswer()
        #expect(answer.digit == nil)
    }

    @Test func clientRemainsUsableAfterCancellingFinishedStream() async throws {
        let client = makeClient()
        for digit in [2, 4] {
            StubURLProtocol.configure { stub in
                stub.respond()
                stub.send("data: {\"type\":\"response.output_text.delta\",\"delta\":\"\(digit)\"}\n\n")
            }
            let answer = try await requestAnswer(using: client)
            #expect(answer.digit == digit)
        }
    }

    private func requestAnswer(using client: OpenAIClient? = nil) async throws -> OpenAIAnswer {
        let client = client ?? makeClient()
        return try await withNetworkTestTimeout {
            try await client.ask(jpeg: Data([1]), apiKey: "test-placeholder", model: "gpt-5.6-luna")
        }
    }

    private func makeClient() -> OpenAIClient {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubURLProtocol.self]
        return OpenAIClient(configuration: configuration)
    }
}

private struct NetworkTestSignal: Sendable {
    private let stream: AsyncStream<Void>
    private let continuation: AsyncStream<Void>.Continuation

    init() {
        (stream, continuation) = AsyncStream.makeStream(of: Void.self, bufferingPolicy: .bufferingNewest(1))
    }

    func send() { continuation.yield(()); continuation.finish() }

    func wait() async throws {
        try await withNetworkTestTimeout {
            var iterator = stream.makeAsyncIterator()
            guard await iterator.next() != nil else { throw CancellationError() }
        }
    }
}

private struct NetworkTestTimeout: Error {}

private func withNetworkTestTimeout<Value: Sendable>(
    _ operation: @escaping @Sendable () async throws -> Value
) async throws -> Value {
    try await withThrowingTaskGroup(of: Value.self) { group in
        group.addTask(operation: operation)
        group.addTask {
            try await Task.sleep(for: .seconds(3))
            throw NetworkTestTimeout()
        }
        defer { group.cancelAll() }
        return try await group.next()!
    }
}

private final class StubURLProtocol: URLProtocol, @unchecked Sendable {
    private static let configurationLock = NSLock()
    private static var handler: ((StubURLProtocol) -> Void)?
    private static var stopHandler: (() -> Void)?
    private var onStop: (() -> Void)?

    static func configure(onStop: (() -> Void)? = nil, handler: @escaping (StubURLProtocol) -> Void) {
        configurationLock.lock()
        Self.handler = handler
        stopHandler = onStop
        configurationLock.unlock()
    }

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        Self.configurationLock.lock()
        let handler = Self.handler
        onStop = Self.stopHandler
        Self.configurationLock.unlock()
        handler?(self)
    }

    override func stopLoading() { onStop?() }

    func respond(status: Int = 200) {
        let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: "HTTP/1.1",
                                       headerFields: ["Content-Type": "text/event-stream"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
    }

    func send(_ text: String) { client?.urlProtocol(self, didLoad: Data(text.utf8)) }
}
