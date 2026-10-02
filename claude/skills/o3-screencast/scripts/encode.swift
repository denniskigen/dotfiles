// Encodes timestamped PNG screencast frames into a constant-frame-rate H.264 MP4.
// Usage: swift encode.swift <frames-dir> <out.mp4> [fps]
import AVFoundation
import CoreGraphics
import Foundation
import ImageIO

struct Frame: Decodable { let file: String; let t: Double }
struct Crop: Decodable { let x: Double; let y: Double; let width: Double; let height: Double }
struct Manifest: Decodable { let frames: [Frame]; let startWall: Double?; let stopWall: Double?; let crop: Crop? }

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: encode <frames-dir> <out.mp4> [fps]"); exit(2) }
let dir = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
let fps = Int32(args.count > 3 ? Int(args[3])! : 60)

let manifest = try JSONDecoder().decode(Manifest.self, from: Data(contentsOf: dir.appendingPathComponent("manifest.json")))
guard let first = manifest.frames.first, let last = manifest.frames.last else { print("no frames"); exit(1) }

func load(_ name: String) -> CGImage {
  let src = CGImageSourceCreateWithURL(dir.appendingPathComponent(name) as CFURL, nil)!
  return CGImageSourceCreateImageAtIndex(src, 0, nil)!
}

let probe = load(first.file)
var cropRect = CGRect(x: 0, y: 0, width: probe.width, height: probe.height)
if let c = manifest.crop {
  cropRect = CGRect(x: c.x, y: c.y, width: c.width, height: c.height).integral
    .intersection(CGRect(x: 0, y: 0, width: probe.width, height: probe.height))
}
// H.264 needs even dimensions
let width = Int(cropRect.width) / 2 * 2
let height = Int(cropRect.height) / 2 * 2
cropRect.size = CGSize(width: width, height: height)

// Hold the last frame until recording stopped (screencast only emits frames on change)
let endT = max(last.t + 1.0 / Double(fps), manifest.stopWall.map { $0 > last.t && $0 - last.t < 30 ? $0 : last.t } ?? last.t)
let duration = endT - first.t

try? FileManager.default.removeItem(at: outURL)
let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: width,
  AVVideoHeightKey: height,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: max(8_000_000, width * height * 6),
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2,
  ],
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
  kCVPixelBufferWidthKey as String: width,
  kCVPixelBufferHeightKey as String: height,
])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

func buffer(for image: CGImage) -> CVPixelBuffer {
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
  let buf = pb!
  CVPixelBufferLockBaseAddress(buf, [])
  let ctx = CGContext(
    data: CVPixelBufferGetBaseAddress(buf), width: width, height: height, bitsPerComponent: 8,
    bytesPerRow: CVPixelBufferGetBytesPerRow(buf), space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
  let cropped = image.cropping(to: cropRect)!
  ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: width, height: height))
  CVPixelBufferUnlockBaseAddress(buf, [])
  return buf
}

let totalFrames = Int((duration * Double(fps)).rounded(.up))
var srcIndex = 0
var current: CVPixelBuffer = buffer(for: load(first.file))
for n in 0..<totalFrames {
  let t = first.t + Double(n) / Double(fps)
  var advanced = false
  while srcIndex + 1 < manifest.frames.count && manifest.frames[srcIndex + 1].t <= t {
    srcIndex += 1
    advanced = true
  }
  if advanced { current = buffer(for: load(manifest.frames[srcIndex].file)) }
  while !input.isReadyForMoreMediaData { usleep(2000) }
  adaptor.append(current, withPresentationTime: CMTime(value: CMTimeValue(n), timescale: fps))
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed { print("failed:", writer.error as Any); exit(1) }
print("wrote \(outURL.path) \(width)x\(height) @\(fps)fps, \(String(format: "%.2f", duration))s, \(totalFrames) frames from \(manifest.frames.count) captures")
