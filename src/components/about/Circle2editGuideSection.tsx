/**
 * Circle 2edit complete guide section for About Product page.
 * Animated brand ring + structure/flow diagrams. Credits from circle-edit constants.
 */
import { CIRCLE_REMOVE_CREDITS, CIRCLE_ADD_BASE_BY_MP } from "@/lib/circle-edit/credits";

const CIRCLE = "#7B6FE0";

function CreditsTable() {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full min-w-[320px] border-collapse text-left text-sm">
        <thead>
          <tr style={{ backgroundColor: `${CIRCLE}22` }}>
            <th className="border-b border-neutral-200 px-3 py-2 font-semibold text-neutral-900">Action</th>
            <th className="border-b border-neutral-200 px-3 py-2 font-semibold text-neutral-900">Cost</th>
          </tr>
        </thead>
        <tbody>
          <tr className="odd:bg-white even:bg-neutral-50/60">
            <td className="border-b border-neutral-100 px-3 py-2 text-neutral-700">Remove</td>
            <td className="border-b border-neutral-100 px-3 py-2 text-neutral-700">{CIRCLE_REMOVE_CREDITS} credits</td>
          </tr>
          <tr className="odd:bg-white even:bg-neutral-50/60">
            <td className="border-b border-neutral-100 px-3 py-2 text-neutral-700">Add</td>
            <td className="border-b border-neutral-100 px-3 py-2 text-neutral-700">
              25–180 credits, scaling with your photo&apos;s resolution ({CIRCLE_ADD_BASE_BY_MP.map((b) => b.credits).join(" / ")} by MP band)
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Circle2editGuideSection() {
  return (
<section id="circle-2edit" aria-labelledby="circle-h" className="scroll-mt-24">
          {/* Section logo — continuous rotating ring (same motion language as the app) */}
          <div className="mb-5 flex items-center gap-3">
            <div
              className="relative grid shrink-0 place-items-center"
              style={{ width: 40, height: 40 }}
              aria-hidden
              data-circle-brand-mark="true"
            >
              <svg viewBox="0 0 32 32" width={40} height={40} className="overflow-visible">
                <defs>
                  <linearGradient id="about-c2e-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A8A0F0" />
                    <stop offset="45%" stopColor="#7B6FE0" />
                    <stop offset="100%" stopColor="#C8C4E8" />
                  </linearGradient>
                </defs>
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  fill="none"
                  stroke="url(#about-c2e-ring)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ transformOrigin: "16px 16px", animation: "about-c2e-ring-spin 8s linear infinite" }}
                />
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  fill="none"
                  stroke="rgba(123,111,224,0.35)"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeDasharray="10 66"
                  style={{ transformOrigin: "16px 16px", animation: "about-c2e-ring-spin 8s linear infinite" }}
                />
                <circle
                  cx="16"
                  cy="16"
                  r="4.5"
                  fill="none"
                  stroke="#7B6FE0"
                  strokeWidth="1.4"
                  opacity={0.9}
                  style={{ animation: "about-c2e-core-pulse 2.8s ease-in-out infinite" }}
                />
              </svg>
              <style>{`
                @keyframes about-c2e-ring-spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                @keyframes about-c2e-core-pulse {
                  0%, 100% { opacity: 0.55; }
                  50% { opacity: 1; }
                }
                @keyframes about-c2e-flow-pulse {
                  0% { stroke-dashoffset: 24; opacity: 0.35; }
                  50% { opacity: 1; }
                  100% { stroke-dashoffset: 0; opacity: 0.35; }
                }
              `}</style>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: CIRCLE }}>
                Mark · remove · add
              </p>
              <h2 id="circle-h" className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
                Circle 2edit — the complete guide
              </h2>
            </div>
          </div>

          <h3 className="mt-8 text-base font-semibold text-neutral-900">The idea behind it</h3>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            Every photo has something you wish were different — a stranger who wandered into frame, a trash can in the
            corner of an otherwise perfect shot, or maybe an empty space that&apos;s just begging for a vase, a plant, or a
            splash of color. Circle 2edit exists for exactly this. You don&apos;t need editing skills, layers, or masks in
            the traditional sense — you just trace what you want to change, tell the engine whether to remove it or add to
            it, and let it do the rest. What used to take a trained eye and specialized software now takes a few seconds of
            marking and one tap.
          </p>

          <h3 className="mt-8 text-base font-semibold text-neutral-900">A canvas that adapts to your photo</h3>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            The moment you upload an image, the canvas reshapes itself to match it. Upload a tall 9:16 story screenshot, and
            the canvas stretches to show it tall, edge to edge. Upload a square Instagram post, and it becomes a clean
            square. Upload a wide landscape shot, and it opens up wide. Nothing gets cropped, squeezed, or shrunk into a box
            that doesn&apos;t fit — the canvas exists to serve your photo, not the other way around.
          </p>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            For detail work — an earring, individual hairs, a small logo on a shirt — the <strong>+ / − zoom controls</strong>{" "}
            let you magnify the canvas as far as you need. Once zoomed in, drag anywhere on the canvas to pan and reach every
            corner of the image, top to bottom, side to side. Nothing is ever out of reach.
          </p>

          <h3 className="mt-8 text-base font-semibold text-neutral-900">Marking with the Circle tool</h3>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            The Circle tool is built for speed. Draw one quick, rough loop around the thing you want to change — you don&apos;t
            need to trace it perfectly, just enclose it.
          </p>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            <em>Example:</em> Say there&apos;s a stray dog sitting in the corner of your beach photo. Instead of carefully
            outlining every paw and ear, just draw one loose oval around the whole dog. The engine understands the intent —
            everything inside your loop is what you&apos;re marking.
          </p>

          <h3 className="mt-8 text-base font-semibold text-neutral-900">Marking with the Brush</h3>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            Some situations need more care than a loop can offer — overlapping objects, fine edges, or hair blending into a
            background. The Brush lets you paint directly over exactly what you mean, stroke by stroke, with full control.
          </p>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            <em>Example:</em> Removing a hat from someone&apos;s head is easy with the Circle tool — but if you&apos;re removing
            sunglasses that overlap their nose and hair, the Brush lets you paint precisely along that boundary so the engine
            knows exactly where the glasses end and the face begins.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-neutral-700">
            <li>
              <strong>Brush size:</strong> a slider running from a fine 4px point up to a broad 60px stroke — thin for
              eyelash-level precision, wide for quickly covering large areas.
            </li>
            <li>
              <strong>Ink colors:</strong> purple, white, and black. These are visibility guides only — they show you what
              you&apos;ve marked against your photo&apos;s background, and never alter your photo&apos;s actual pixels or colors.
            </li>
          </ul>

          <h3 className="mt-8 text-base font-semibold text-neutral-900">The Eraser</h3>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            If a stroke goes slightly outside where you meant it to, the Eraser lets you clean up just that part of your
            marking — no need to clear everything and start your selection over.
          </p>

          <h3 className="mt-8 text-base font-semibold text-neutral-900">Remove — taking something out</h3>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            Once your object is marked, tap <strong>Remove Object</strong>. The engine looks at everything surrounding your
            marked region — the texture of the sand, the pattern of a wall, the gradient of a sky — and reconstructs that
            space as though whatever you marked was never there.
          </p>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            <em>Example:</em> Circle the photobomber standing behind your group photo, tap Remove, and the wall or scenery
            behind them fills back in naturally, matching the lighting and texture around it.
          </p>

          <h3 className="mt-8 text-base font-semibold text-neutral-900">Add — placing something new</h3>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            Tap <strong>Browse objects</strong> to open the object library. Pick an object — a plant, a drink, a piece of
            furniture, whatever fits your scene — then mark the spot on your photo where it should appear. Tap{" "}
            <strong>Add Object</strong>, and the engine places it in, adjusting its lighting, shadow direction, scale, and
            angle so it looks like it was part of the original photo, not pasted on top of it.
          </p>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            <em>Example:</em> You have an empty side table in a living room photo. Browse the object library, choose a vase,
            mark the tabletop where it should sit, and the engine drops it in with a shadow that matches your room&apos;s light
            source.
          </p>

          <h3 className="mt-8 text-base font-semibold text-neutral-900">Your history, saved automatically</h3>
          <p className="mt-3 text-base leading-relaxed text-neutral-700">
            Every successful Remove or Add saves itself to your history the moment it completes — no extra step, no manual
            save button. You can return anytime to revisit or re-download a past edit.
          </p>

          <h3 className="mt-8 text-base font-semibold text-neutral-900">Credits</h3>
          <CreditsTable />
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            Remove always costs the same flat amount. Add scales with your photo&apos;s megapixel count — the more resolution
            your photo has, the more detail the engine has to analyze and match, so larger photos cost more than smaller ones.
          </p>

          {/* Diagram 1 — structural blocks Upload → Marking → Action → Output */}
          <h3 className="mt-10 text-base font-semibold text-neutral-900">How the tool is structured</h3>
          <div
            className="mt-4 overflow-x-auto rounded-xl border p-4 sm:p-5"
            style={{ borderColor: `${CIRCLE}55`, background: "linear-gradient(180deg, #14161E 0%, #101218 100%)" }}
            aria-label="Circle 2edit structure: Upload, Marking, Action, Output"
          >
            <div className="flex min-w-[560px] items-stretch justify-between gap-2">
              {[
                { title: "UPLOAD", desc: "Your photo", icon: "↑" },
                { title: "MARKING", desc: "Circle / Brush", icon: "○" },
                { title: "ACTION", desc: "Remove / Add", icon: "⇄" },
                { title: "OUTPUT", desc: "Save / Share", icon: "↓" },
              ].map((b, i, arr) => (
                <div key={b.title} className="flex flex-1 items-center gap-2">
                  <div
                    className="flex flex-1 flex-col items-center rounded-xl border-2 px-2 py-3 text-center"
                    style={{ borderColor: CIRCLE, background: "#1A1C24" }}
                  >
                    <span className="text-lg font-semibold text-white/90" aria-hidden>
                      {b.icon}
                    </span>
                    <p className="mt-1 text-[11px] font-bold tracking-wide text-white">{b.title}</p>
                    <p className="mt-0.5 text-[10px] text-white/60">{b.desc}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <svg width="28" height="12" viewBox="0 0 28 12" className="shrink-0" aria-hidden>
                      <line
                        x1="0"
                        y1="6"
                        x2="28"
                        y2="6"
                        stroke={CIRCLE}
                        strokeWidth="2"
                        strokeDasharray="6 6"
                        style={{ animation: "about-c2e-flow-pulse 1.8s linear infinite" }}
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Diagram 2 — flow Mark → Analyze → Generate → Blend */}
          <h3 className="mt-10 text-base font-semibold text-neutral-900">What happens inside Action</h3>
          <div
            className="mt-4 overflow-x-auto rounded-xl border p-4 sm:p-5"
            style={{ borderColor: `${CIRCLE}55`, background: "linear-gradient(180deg, #14161E 0%, #101218 100%)" }}
            aria-label="Action flow: Mark, Analyze, Generate, Blend"
          >
            <div className="flex min-w-[480px] items-center justify-between gap-2">
              {[
                { title: "MARK", icon: "◎" },
                { title: "ANALYZE", icon: "◉" },
                { title: "GENERATE", icon: "✦" },
                { title: "BLEND", icon: "⧉" },
              ].map((n, i, arr) => (
                <div key={n.title} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="grid h-14 w-14 place-items-center rounded-full border-2 text-lg font-semibold text-white"
                      style={{
                        borderColor: CIRCLE,
                        background: "#1A1C24",
                        boxShadow: `0 0 12px ${CIRCLE}55`,
                      }}
                    >
                      {n.icon}
                    </div>
                    <p className="text-[11px] font-bold tracking-wide text-white">{n.title}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <svg width="32" height="12" viewBox="0 0 32 12" className="mb-5 shrink-0" aria-hidden>
                      <line
                        x1="0"
                        y1="6"
                        x2="32"
                        y2="6"
                        stroke={CIRCLE}
                        strokeWidth="2"
                        strokeDasharray="5 5"
                        style={{ animation: "about-c2e-flow-pulse 1.6s linear infinite" }}
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
  );
}
