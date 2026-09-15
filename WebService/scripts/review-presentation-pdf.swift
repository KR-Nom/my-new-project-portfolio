import Foundation
import PDFKit
import AppKit
import Vision

// Reopen the exported PDF and rasterize every page for visual review.
let path = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "산출물/1반_장현진_HowToDo-개요.pdf"
guard let pdf = PDFDocument(url: URL(fileURLWithPath: path)) else { fatalError("Cannot open PDF") }
let output = URL(fileURLWithPath: CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : "report-assets/redesign/pdf-review", isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
var rows: [[String: Any]] = []
let columns = 4, cellW = 480, cellH = 294
let sheet = NSImage(size: NSSize(width: columns * cellW, height: ((pdf.pageCount + columns - 1) / columns) * cellH))
sheet.lockFocus()
NSColor(calibratedWhite: 0.9, alpha: 1).setFill()
NSRect(origin: .zero, size: sheet.size).fill()
for i in 0..<pdf.pageCount {
    guard let page = pdf.page(at: i) else { fatalError("Missing page") }
    let bounds = page.bounds(for: .mediaBox)
    let thumbnail = page.thumbnail(of: NSSize(width: 1440, height: 810), for: .mediaBox)
    guard let tiff = thumbnail.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) else { fatalError("Cannot render page") }
    try png.write(to: output.appendingPathComponent(String(format: "page-%02d.png", i + 1)))
    let x = CGFloat((i % columns) * cellW + 8)
    let y = sheet.size.height - CGFloat((i / columns + 1) * cellH) + 24
    thumbnail.draw(in: NSRect(x: x, y: y, width: 464, height: 261))
    ("\(i + 1)" as NSString).draw(at: NSPoint(x: x, y: y - 20), withAttributes: [.font: NSFont.systemFont(ofSize: 14), .foregroundColor: NSColor.black])
    let text = page.string ?? ""
    try text.write(to: output.appendingPathComponent(String(format: "page-%02d.txt", i + 1)), atomically: true, encoding: .utf8)
    var row: [String: Any] = ["page": i + 1, "widthPt": bounds.width, "heightPt": bounds.height, "ratio16by9": abs(bounds.width / bounds.height - 16.0 / 9.0) < 0.002, "textCharacters": text.count]
    let compactText = text.replacingOccurrences(of: "\\s+", with: "", options: .regularExpression)
    let unwantedCopy = ["발췌", "실제화면", "실제서비스화면", "사용자제공", "분할배치", "예시그림", "명중2명확대"]
    row["editorialFlags"] = unwantedCopy.filter { compactText.contains($0) }
    // Decode the QR from the exported PDF, not from a fabricated link or source asset.
    if i == 12 || i == 13 {
        guard let cgImage = bitmap.cgImage else { fatalError("Cannot read QR page bitmap") }
        let request = VNDetectBarcodesRequest()
        request.symbologies = [.qr]
        try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
        let payloads = (request.results ?? []).compactMap { $0.payloadStringValue }
        let expected = i == 12 ? "http://127.0.0.1:5174/p/hyeonjin" : "http://127.0.0.1:5174/join/SKALA3"
        row["qrPayloads"] = payloads
        row["expectedQrDecoded"] = payloads.contains(expected)
    }
    rows.append(row)
}
sheet.unlockFocus()
let bitmap = NSBitmapImageRep(data: sheet.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent("contact-sheet.png"))
let json = try JSONSerialization.data(withJSONObject: ["pages": pdf.pageCount, "checks": rows], options: [.prettyPrinted, .sortedKeys])
try json.write(to: output.appendingPathComponent("pdf-checks.json"))
print(String(data: json, encoding: .utf8)!)
guard pdf.pageCount == 25,
      rows.allSatisfy({ ($0["ratio16by9"] as? Bool) == true && ($0["textCharacters"] as? Int ?? 0) > 0 && ($0["editorialFlags"] as? [String] ?? []).isEmpty }),
      rows.filter({ $0["expectedQrDecoded"] != nil }).count == 2,
      rows.filter({ $0["expectedQrDecoded"] != nil }).allSatisfy({ ($0["expectedQrDecoded"] as? Bool) == true })
else { fatalError("PDF review failed: page count, ratio, copy, or QR mismatch") }
