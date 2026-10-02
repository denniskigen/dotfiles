// Extracts still frames from a video so a recording can be checked before it is shared.
// Usage: stills <video> <out-dir> <seconds> [seconds...]
import AVFoundation
import Foundation
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 4 else { print("usage: stills <video> <out-dir> <seconds>..."); exit(2) }
let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let outDir = URL(fileURLWithPath: args[2])
try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let generator = AVAssetImageGenerator(asset: asset)
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero
for arg in args[3...] {
  let seconds = Double(arg)!
  let image = try generator.copyCGImage(at: CMTime(seconds: seconds, preferredTimescale: 600), actualTime: nil)
  let url = outDir.appendingPathComponent(String(format: "t%06.2f.png", seconds))
  let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, image, nil)
  CGImageDestinationFinalize(dest)
  print(url.path)
}
