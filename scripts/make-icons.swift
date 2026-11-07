import AppKit
import Foundation

let root = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "extension/icons")
try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
func render(_ size: Int, toolbar: Bool) throws {
    let side = CGFloat(size)
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let rect = NSRect(x: 0, y: 0, width: side, height: side)
    if !toolbar {
        let inset = side * 0.05
        let tile = NSBezierPath(roundedRect: rect.insetBy(dx: inset, dy: inset), xRadius: side * 0.21, yRadius: side * 0.21)
        NSGradient(starting: NSColor(calibratedRed: 0.20, green: 0.63, blue: 1, alpha: 1), ending: NSColor(calibratedRed: 0.02, green: 0.35, blue: 0.92, alpha: 1))!.draw(in: tile, angle: -90)
        NSColor.white.withAlphaComponent(0.25).setStroke()
        tile.lineWidth = max(1, side * 0.005); tile.stroke()
    }
    let symbol = NSImage(systemSymbolName: "command", accessibilityDescription: nil)!
        .withSymbolConfiguration(NSImage.SymbolConfiguration(pointSize: side * 0.60, weight: .medium))!
    let tint = toolbar ? NSColor.black : NSColor.white
    let tinted = NSImage(size: symbol.size, flipped: false) { bounds in
        symbol.draw(in: bounds)
        tint.setFill(); bounds.fill(using: .sourceIn)
        return true
    }
    let length = side * (toolbar ? 0.9 : 0.52)
    tinted.draw(in: NSRect(x: (side - length)/2, y: (side - length)/2, width: length, height: length))
    NSGraphicsContext.restoreGraphicsState()
    let data = bitmap.representation(using: .png, properties: [:])!
    try data.write(to: root.appendingPathComponent("\(toolbar ? "toolbar" : "icon")-\(size).png"))
}
for size in [48, 64, 96, 128, 256, 512, 1024] { try render(size, toolbar: false) }
for size in [16, 19, 32, 38] { try render(size, toolbar: true) }
