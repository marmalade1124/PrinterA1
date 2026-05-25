import { GlassCard } from '../components/ui/GlassCard'

const FAQ = [
  {
    q: 'How do I add a new print job?',
    a: 'Click "New Print Job" in the sidebar or the Job Queue header. Fill in the client name, material, layer height, printer, and estimated print time.',
  },
  {
    q: 'How does the pricing engine calculate costs?',
    a: 'Upload a .stl, .obj, or .3mf file. The engine extracts the model volume and estimates print time, then calculates material cost + electricity cost + your configured markup buffer.',
  },
  {
    q: 'When does inventory get deducted?',
    a: 'Stock is automatically deducted when a job is advanced to "Ready for Pickup". The amount deducted is the material used value set on the job.',
  },
  {
    q: 'How do I set low-stock alerts?',
    a: "Go to Inventory, find the material, and set the Alert Threshold field. You'll see a warning badge whenever stock falls at or below that level.",
  },
  {
    q: 'How do I change the default electricity rate or markup?',
    a: 'Go to Settings and update the Electricity Rate and Default Markup Buffer fields, then save.',
  },
]

export default function SupportPage() {
  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="px-8 pt-6 pb-4">
        <h1 className="text-headline-lg text-on-surface font-semibold">Support</h1>
        <p className="text-body-md text-on-surface-variant mt-0.5">
          Quick reference and usage tips for PrintOS.
        </p>
      </div>

      <div className="flex-1 px-8 pb-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {/* Quick tips */}
          <GlassCard className="p-6 flex flex-col gap-4">
            <h2 className="text-body-lg text-on-surface font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">tips_and_updates</span>
              Quick Tips
            </h2>
            <ul className="flex flex-col gap-3">
              {[
                'Use the Pricing Engine before creating a job to get an accurate quote.',
                'Set low-stock thresholds on all materials so you never run out mid-job.',
                'The Kanban board updates in real-time — open it on any device to monitor jobs.',
                'Advance jobs through stages using the "Advance" button on each card.',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-body-md text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 flex-shrink-0" aria-hidden="true">check_circle</span>
                  {tip}
                </li>
              ))}
            </ul>
          </GlassCard>

          {/* FAQ */}
          <div>
            <h2 className="text-body-lg text-on-surface font-semibold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">help</span>
              Frequently Asked Questions
            </h2>
            <div className="flex flex-col gap-3">
              {FAQ.map(({ q, a }, i) => (
                <GlassCard key={i} className="p-5 flex flex-col gap-2">
                  <p className="text-body-md text-on-surface font-medium">{q}</p>
                  <p className="text-body-md text-on-surface-variant">{a}</p>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Contact */}
          <GlassCard className="p-6 flex flex-col gap-3">
            <h2 className="text-body-lg text-on-surface font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">contact_support</span>
              Need More Help?
            </h2>
            <p className="text-body-md text-on-surface-variant">
              PrintOS is your personal business tool. If you need to customise behaviour or add features, the source code is fully yours to modify.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
