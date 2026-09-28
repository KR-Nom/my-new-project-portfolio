/*
 '''
 작성자: 장현진 / Codex
 작성일: 2026-09-17
 변경사항: 화면 좌표 검증, 메모리 캡처 및 JPEG 전처리 구현
 설명: 선택 영역만 ScreenCaptureKit으로 가져온다. 이미지 파일은 생성하지 않는다.
 실행 방법: 앱에서 영역을 설정한 뒤 Option+Space
 '''
 */

import ColorSync
import CoreGraphics
import Foundation
import ImageIO
import ScreenCaptureKit
import UniformTypeIdentifiers

struct CaptureRegion: Codable, Equatable, Sendable {
    let displayID: CGDirectDisplayID
    let rect: CGRect                         // Display-local points, with the origin at its top left.
    let displaySize: CGSize
    var displayUUID: String? = nil

    static let minimumDimension: CGFloat = 12

    /// AppKit screen coordinates have a bottom-left origin, independent of a screen's offset.
    static func make(
        selectionInScreenCoordinates selection: CGRect,
        screenFrame: CGRect,
        displayID: CGDirectDisplayID,
        displayUUID: String? = nil
    ) -> CaptureRegion? {
        guard selection.isFiniteRect, screenFrame.isFiniteRect,
              screenFrame.width > 0, screenFrame.height > 0 else { return nil }
        let clipped = selection.standardized.intersection(screenFrame)
        guard !clipped.isNull,
              clipped.width >= minimumDimension,
              clipped.height >= minimumDimension else { return nil }
        return CaptureRegion(
            displayID: displayID,
            rect: CGRect(
                x: clipped.minX - screenFrame.minX,
                y: screenFrame.maxY - clipped.maxY,
                width: clipped.width,
                height: clipped.height
            ),
            displaySize: screenFrame.size,
            displayUUID: displayUUID
        )
    }

    func validatedRect(for currentDisplaySize: CGSize) throws -> CGRect {
        guard displaySize.width.isFinite, displaySize.height.isFinite,
              currentDisplaySize.width.isFinite, currentDisplaySize.height.isFinite,
              displaySize.width > 0, displaySize.height > 0,
              currentDisplaySize.width > 0, currentDisplaySize.height > 0,
              rect.isFiniteRect,
              rect.width >= Self.minimumDimension,
              rect.height >= Self.minimumDimension else { throw CaptureError.invalidRegion }
        guard abs(displaySize.width - currentDisplaySize.width) < 0.5,
              abs(displaySize.height - currentDisplaySize.height) < 0.5 else {
            throw CaptureError.displayChanged
        }
        guard rect.minX >= 0, rect.minY >= 0,
              rect.maxX <= currentDisplaySize.width,
              rect.maxY <= currentDisplaySize.height else { throw CaptureError.invalidRegion }
        return rect
    }

    func pixelSize(scale: CGFloat) throws -> CGSize {
        _ = try validatedRect(for: displaySize)
        guard scale.isFinite, scale > 0, scale <= 8 else { throw CaptureError.invalidRegion }
        return CGSize(width: ceil(rect.width * scale), height: ceil(rect.height * scale))
    }

    static func uuid(for displayID: CGDirectDisplayID) -> String? {
        guard let uuid = CGDisplayCreateUUIDFromDisplayID(displayID)?.takeRetainedValue() else { return nil }
        return CFUUIDCreateString(nil, uuid) as String
    }

    func resolvedDisplayID() throws -> CGDirectDisplayID {
        let resolved: CGDirectDisplayID
        if let displayUUID {
            guard let uuid = CFUUIDCreateFromString(nil, displayUUID as CFString) else {
                throw CaptureError.displayUnavailable
            }
            resolved = CGDisplayGetDisplayIDFromUUID(uuid)
        } else {
            resolved = displayID
        }
        guard resolved != kCGNullDirectDisplay, CGDisplayIsOnline(resolved) != 0 else {
            throw CaptureError.displayUnavailable
        }
        return resolved
    }
}

private extension CGRect {
    var isFiniteRect: Bool {
        origin.x.isFinite && origin.y.isFinite && size.width.isFinite && size.height.isFinite
    }
}

enum CaptureError: LocalizedError {
    case permissionDenied
    case displayUnavailable
    case displayChanged
    case invalidRegion
    case imageEncodingFailed

    var errorDescription: String? {
        switch self {
        case .permissionDenied: return "Screen Recording permission is required. Enable it in Settings."
        case .displayUnavailable: return "The selected display is unavailable. Set the capture region again."
        case .displayChanged: return "The display resolution changed. Set the capture region again."
        case .invalidRegion: return "The capture region is invalid. Set the capture region again."
        case .imageEncodingFailed: return "The captured image could not be encoded."
        }
    }
}

actor CaptureManager {
    private var contentTask: Task<SCShareableContent, Error>?
    private var filters: [CGDirectDisplayID: SCContentFilter] = [:]
    private var generation = 0

    /// Warm the expensive shareable-content lookup only after the user granted access.
    func prepare() async {
        guard CGPreflightScreenCaptureAccess() else { return }
        do {
            _ = try await shareableContent()
        } catch {
            // Warm-up is optional; a real request reports actionable errors to the coordinator.
        }
    }

    func invalidate() {
        generation += 1
        contentTask?.cancel()
        contentTask = nil
        filters.removeAll()
    }

    func capture(region: CaptureRegion) async throws -> CGImage {
        try Task.checkCancellation()
        guard CGPreflightScreenCaptureAccess() else { throw CaptureError.permissionDenied }
        let displayID = try region.resolvedDisplayID()
        let sourceRect = try region.validatedRect(for: CGDisplayBounds(displayID).size)
        let filter = try await contentFilter(for: displayID)
        try Task.checkCancellation()
        // Revalidate after asynchronous discovery in case a display was removed or resized.
        guard try region.resolvedDisplayID() == displayID else { throw CaptureError.displayChanged }
        _ = try region.validatedRect(for: CGDisplayBounds(displayID).size)

        let pixels = try region.pixelSize(scale: CGFloat(filter.pointPixelScale))
        let configuration = SCStreamConfiguration()
        configuration.sourceRect = sourceRect
        configuration.width = Int(pixels.width)
        configuration.height = Int(pixels.height)
        configuration.showsCursor = false
        configuration.capturesAudio = false
        configuration.scalesToFit = false
        configuration.ignoreShadowsSingleWindow = true

        do {
            let image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: configuration)
            try Task.checkCancellation()
            return image
        } catch {
            if !(error is CancellationError) { invalidate() }
            throw error
        }
    }

    private func shareableContent() async throws -> SCShareableContent {
        let currentGeneration = generation
        let task: Task<SCShareableContent, Error>
        if let contentTask {
            task = contentTask
        } else {
            task = Task { try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true) }
            contentTask = task
        }
        do {
            let content = try await task.value
            guard currentGeneration == generation else { throw CancellationError() }
            return content
        } catch {
            if currentGeneration == generation { contentTask = nil }
            throw error
        }
    }

    private func contentFilter(for displayID: CGDirectDisplayID) async throws -> SCContentFilter {
        if let filter = filters[displayID] { return filter }
        let content = try await shareableContent()
        guard let display = content.displays.first(where: { $0.displayID == displayID }) else {
            invalidate()
            throw CaptureError.displayUnavailable
        }
        let ownApplications = content.applications.filter { $0.processID == ProcessInfo.processInfo.processIdentifier }
        let filter = SCContentFilter(display: display, excludingApplications: ownApplications, exceptingWindows: [])
        filters[displayID] = filter
        return filter
    }
}

enum ImagePreprocessor {
    static let maximumWidth = 1344
    static let jpegQuality = 0.84

    /// Call from a background task, never the UI thread. Neither the source nor JPEG touches disk.
    static func jpegData(from image: CGImage) throws -> Data {
        guard image.width > 0, image.height > 0 else { throw CaptureError.imageEncodingFailed }
        let outputImage: CGImage
        if image.width > maximumWidth {
            let height = max(1, Int((Double(image.height) * Double(maximumWidth) / Double(image.width)).rounded()))
            guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
                  let context = CGContext(
                    data: nil, width: maximumWidth, height: height,
                    bitsPerComponent: 8, bytesPerRow: 0, space: colorSpace,
                    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
                  ) else { throw CaptureError.imageEncodingFailed }
            context.interpolationQuality = .high
            context.draw(image, in: CGRect(x: 0, y: 0, width: maximumWidth, height: height))
            guard let resized = context.makeImage() else { throw CaptureError.imageEncodingFailed }
            outputImage = resized
        } else {
            outputImage = image
        }
        let bytes = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(bytes, UTType.jpeg.identifier as CFString, 1, nil) else {
            throw CaptureError.imageEncodingFailed
        }
        CGImageDestinationAddImage(destination, outputImage, [kCGImageDestinationLossyCompressionQuality: jpegQuality] as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { throw CaptureError.imageEncodingFailed }
        return bytes as Data
    }
}
