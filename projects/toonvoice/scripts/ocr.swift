import Foundation
import Vision
import ImageIO

struct TextRegion: Codable {
    let text: String
    let confidence: Float
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

do {
    guard CommandLine.arguments.count == 2 else {
        throw NSError(domain: "ToonVoice", code: 1, userInfo: [NSLocalizedDescriptionKey: "An image path is required."])
    }
    let url = URL(fileURLWithPath: CommandLine.arguments[1])
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["ko-KR", "en-US"]
    request.usesLanguageCorrection = true
    let handler = VNImageRequestHandler(url: url, options: [:])
    try handler.perform([request])
    let results = (request.results ?? []).compactMap { observation -> TextRegion? in
        guard let text = observation.topCandidates(1).first else { return nil }
        let rect = observation.boundingBox
        return TextRegion(text: text.string, confidence: text.confidence,
                          x: rect.origin.x, y: 1 - rect.origin.y - rect.height,
                          width: rect.width, height: rect.height)
    }.sorted { abs($0.y - $1.y) > 0.015 ? $0.y < $1.y : $0.x < $1.x }
    let output = try JSONEncoder().encode(results)
    FileHandle.standardOutput.write(output)
} catch {
    FileHandle.standardError.write(Data("Text recognition failed: \(error.localizedDescription)\n".utf8))
    exit(1)
}
