const questions = [
  ["What is AMATYC?", "AMATYC is a national math organization for community colleges. It runs the Student Math League (SML), a competition open to community college students across the country."],
  ["What is the Student Math League (SML)?", "A national math test taken by over four thousand community college students. It has 20 multiple-choice or short-answer questions covering concepts through Pre-Calculus. You may use any scientific or graphing calculator that does not have a QWERTY (typewriter) keyboard."],
  ["Who can participate?", "Community college students from any college can join the national competition. At OCC, Round One is open to enrolled students who are registered and present their ID."],
  ["What is AMATYC Arena?", "A practice platform built by OCC MAT members. Use it to practice AMATYC-style problems, train for the test, and see how you rank."],
] as const;

export default function AboutUs() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section aria-label="About the community and competition" className="panel min-w-0 space-y-6 p-6 sm:p-8">
        {questions.map(([question, answer]) => (
          <div key={question}>
            <h2 className="text-lg font-semibold">{question}</h2>
            <p className="mt-2 text-sm leading-7 muted">{answer}</p>
          </div>
        ))}
        <div>
          <h2 className="text-lg font-semibold">How do I register?</h2>
          <p className="mt-2 text-sm leading-7 muted">Scan the QR code on the flyer on our website or our <a className="text-emerald-400 underline" href="https://www.instagram.com/mat_occ/" target="_blank" rel="noopener noreferrer">Instagram</a>.</p>
        </div>
      </section>
      <div className="min-w-0 space-y-6">
        <section aria-labelledby="about-round-one" className="panel p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">OCC Student Math League</p>
          <h2 id="about-round-one" className="mt-2 text-2xl font-bold">Round One · Friday, November 6</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div><dt className="muted">Time</dt><dd className="mt-1 font-semibold">10:00 am to 11:30 am <span className="block font-normal muted">1-hour test block</span></dd></div>
            <div><dt className="muted">Place</dt><dd className="mt-1 font-semibold">MBCC 318</dd></div>
          </dl>
          <h3 className="mt-5 border-t border-edge pt-4 font-semibold">Cash prizes</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            {[["1st place", "$100"], ["2nd place", "$75"], ["3rd place", "$50"], ["4th place", "$25"]].map(([place, amount]) => (
              <div key={place} className="rounded-lg border border-edge bg-ink p-3 text-center">
                <dt className="text-xs muted">{place}</dt>
                <dd className="mt-1 text-2xl font-bold text-emerald-400">{amount}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="about-contact" className="panel p-6 sm:p-8">
          <h2 id="about-contact" className="text-lg font-semibold">Questions? Contact Prof. Vu Phan</h2>
          <p className="mt-3 text-sm muted">Office: MBCC 155</p>
          <a className="mt-2 inline-flex min-h-11 items-center break-all text-sm text-emerald-400 underline" href="mailto:vphan1@cccd.edu">vphan1@cccd.edu</a>
        </section>
      </div>
    </div>
  );
}
