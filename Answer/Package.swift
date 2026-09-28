// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "QuizFlash",
    platforms: [.macOS(.v14)],
    products: [.executable(name: "QuizFlash", targets: ["QuizFlash"])],
    targets: [
        .executableTarget(
            name: "QuizFlash",
            linkerSettings: [
                .linkedFramework("AppKit"), .linkedFramework("SwiftUI"),
                .linkedFramework("ScreenCaptureKit"), .linkedFramework("Carbon"),
                .linkedFramework("Security"), .linkedFramework("ImageIO")
            ]
        ),
        .testTarget(name: "QuizFlashTests", dependencies: ["QuizFlash"])
    ]
)
