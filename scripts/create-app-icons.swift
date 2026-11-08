import AppKit
let source = NSImage(contentsOfFile: CommandLine.arguments[1])!
let folder = CommandLine.arguments[2]
for size in [180, 192, 512] {
 let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
 let context = NSGraphicsContext(bitmapImageRep: bitmap)!
 NSGraphicsContext.saveGraphicsState()
 NSGraphicsContext.current = context
 NSColor(calibratedWhite: 0.08, alpha: 1).setFill()
 NSRect(x: 0,y: 0,width: size,height: size).fill()
 let width = CGFloat(size) * 0.68
 let height = width * source.size.height / source.size.width
 source.draw(in: NSRect(x:(CGFloat(size)-width)/2,y:(CGFloat(size)-height)/2,width:width,height:height), from:.zero, operation:.sourceOver, fraction:1)
 NSGraphicsContext.restoreGraphicsState()
 let data = bitmap.representation(using: .png, properties: [:])!
 try data.write(to: URL(fileURLWithPath: folder + "/vistavilla-app-\(size).png"))
}
