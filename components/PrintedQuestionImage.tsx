import frames from "@/data/historical/image-frames.json";
import tilts from "@/data/historical/image-tilt.json";

/** Trim only the scanned page's blank border; preserve the original asset. */
export default function PrintedQuestionImage({ src, alt }: { src: string; alt: string }) {
  const frame = (frames as Record<string, number[]>)[src];
  if (!frame) return <img src={src} alt={alt} className="block w-full" />;
  const [width, height, left, top, cropWidth, cropHeight, choiceSplit] = frame;
  const angle = (tilts as Record<string, number>)[src] ?? 0;
  function portion(offset: number, portionHeight: number, description: string) {
    return <div className="relative overflow-hidden bg-white" style={{ aspectRatio: `${cropWidth}/${portionHeight}` }}>
      <img src={src} alt={description} className="absolute block max-w-none" style={{
        width: `${width / cropWidth * 100}%`, height: `${height / portionHeight * 100}%`,
        left: `${-left / cropWidth * 100}%`, top: `${-(top + offset) / portionHeight * 100}%`,
      }} />
    </div>;
  }
  return (
    <div className="bg-white" style={angle ? { padding: `${Math.sin(Math.abs(angle) * Math.PI / 180) * 50 + 0.5}% 1%` } : undefined}>
    <div style={angle ? { transform: `rotate(${angle}deg)`, transformOrigin: "center" } : undefined}>
      {choiceSplit ? <>
        {portion(0, choiceSplit, alt)}
        <div className="h-5 sm:h-6" aria-hidden="true" />
        {portion(choiceSplit, cropHeight - choiceSplit, "Printed answer choices")}
      </> : portion(0, cropHeight, alt)}
    </div>
    </div>
  );
}
