import CoreGraphics
import Foundation
import ImageIO
import Testing
@testable import QuizFlash

struct RegionTests {
    @Test
    func testConvertsBottomLeftSelectionToDisplayLocalTopLeftPoints() throws {
        let region = try #require(CaptureRegion.make(
            selectionInScreenCoordinates: CGRect(x: 100, y: 600, width: 500, height: 200),
            screenFrame: CGRect(x: 0, y: 0, width: 1440, height: 900), displayID: 1
        ))
        #expect(region.rect == CGRect(x: 100, y: 100, width: 500, height: 200))
        #expect(try region.pixelSize(scale: 2) == CGSize(width: 1000, height: 400))
    }

    @Test
    func testRetinaScaleChangesPixelsWithoutScalingSourceRect() throws {
        let region = CaptureRegion(displayID: 1, rect: CGRect(x: 50, y: 80, width: 300, height: 160), displaySize: CGSize(width: 1440, height: 900))
        #expect(try region.pixelSize(scale: 1) == CGSize(width: 300, height: 160))
        #expect(try region.pixelSize(scale: 2) == CGSize(width: 600, height: 320))
        #expect(try region.validatedRect(for: region.displaySize) == region.rect)
    }

    @Test
    func testLeftAndAboveMonitorOffsetsAreRemoved() throws {
        let frame = CGRect(x: -1920, y: 900, width: 1920, height: 1080)
        let region = try #require(CaptureRegion.make(
            selectionInScreenCoordinates: CGRect(x: -1800, y: 1600, width: 600, height: 280),
            screenFrame: frame, displayID: 2
        ))
        #expect(region.rect == CGRect(x: 120, y: 100, width: 600, height: 280))
        #expect(region.displaySize == frame.size)
    }

    @Test
    func testBelowMonitorOffsetAndReverseDrag() throws {
        let frame = CGRect(x: 200, y: -1080, width: 1920, height: 1080)
        let region = try #require(CaptureRegion.make(
            selectionInScreenCoordinates: CGRect(x: 800, y: -200, width: -500, height: -300),
            screenFrame: frame, displayID: 3
        ))
        #expect(region.rect == CGRect(x: 100, y: 200, width: 500, height: 300))
    }

    @Test
    func testSelectionClampsAtDisplayBounds() throws {
        let frame = CGRect(x: 0, y: 0, width: 1440, height: 900)
        let region = try #require(CaptureRegion.make(
            selectionInScreenCoordinates: CGRect(x: -20, y: 700, width: 600, height: 240),
            screenFrame: frame, displayID: 1
        ))
        #expect(region.rect == CGRect(x: 0, y: 0, width: 580, height: 200))
    }

    @Test
    func testOffDisplayTinyAndNonFiniteSelectionsAreRejected() {
        let frame = CGRect(x: 0, y: 0, width: 1440, height: 900)
        let selections = [
            CGRect(x: 1500, y: 100, width: 400, height: 100),
            CGRect(x: 100, y: 100, width: 2, height: 2),
            CGRect(x: CGFloat.nan, y: 100, width: 100, height: 100)
        ]
        for selection in selections {
            #expect(CaptureRegion.make(selectionInScreenCoordinates: selection, screenFrame: frame, displayID: 1) == nil)
        }
    }

    @Test
    func testChangedResolutionAndCorruptSavedRectangleFailClosed() {
        let size = CGSize(width: 1440, height: 900)
        let valid = CaptureRegion(displayID: 1, rect: CGRect(x: 100, y: 100, width: 500, height: 200), displaySize: size)
        #expect(throws: CaptureError.self) { try valid.validatedRect(for: CGSize(width: 1280, height: 800)) }
        let outside = CaptureRegion(displayID: 1, rect: CGRect(x: 1400, y: 100, width: 500, height: 200), displaySize: size)
        #expect(throws: CaptureError.self) { try outside.validatedRect(for: size) }
        #expect(throws: CaptureError.self) { try valid.pixelSize(scale: 0) }
        #expect(throws: CaptureError.self) { try valid.pixelSize(scale: .infinity) }
    }

    @Test
    func testSavedRegionRoundTripsIncludingStableDisplayIdentity() throws {
        let region = CaptureRegion(displayID: 1, rect: CGRect(x: 100, y: 120, width: 600, height: 300), displaySize: CGSize(width: 1440, height: 900), displayUUID: "display-identity")
        let restored = try JSONDecoder().decode(CaptureRegion.self, from: JSONEncoder().encode(region))
        #expect(restored == region)
    }

    @Test
    func testJPEGPipelineDownsizesWideImagesAndPreservesAspectRatio() throws {
        let space = try #require(CGColorSpace(name: CGColorSpace.sRGB))
        let context = try #require(CGContext(data: nil, width: 2688, height: 1200, bitsPerComponent: 8, bytesPerRow: 0, space: space, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue))
        context.setFillColor(CGColor(gray: 1, alpha: 1))
        context.fill(CGRect(x: 0, y: 0, width: 2688, height: 1200))
        let image = try #require(context.makeImage())
        let jpeg = try ImagePreprocessor.jpegData(from: image)
        let source = try #require(CGImageSourceCreateWithData(jpeg as CFData, nil))
        let decoded = try #require(CGImageSourceCreateImageAtIndex(source, 0, nil))
        #expect(decoded.width == 1344)
        #expect(decoded.height == 600)
    }
}
