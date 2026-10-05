import { useState } from "react";
import { fileToResizedBase64 } from "./lib/image";

const API = import.meta.env.VITE_API_URL || "";

const SPECIES = ["Cattle", "Buffalo", "Goat", "Sheep", "Pig", "Poultry", "Horse", "Other"];

const URGENCY = {
  emergency: { label: "Emergency: call a vet now", cls: "bg-alarm text-white" },
  urgent: { label: "Urgent: see a vet within 24 hours", cls: "bg-hay text-ink" },
  monitor: { label: "Monitor closely", cls: "bg-field text-white" },
  routine: { label: "Low concern", cls: "bg-mist text-ink" },
};

const LIKELIHOOD = {
  high: "border-l-alarm",
  medium: "border-l-hay",
  low: "border-l-field",
};

const inputCls =
  "w-full rounded-md border border-ink/25 bg-white px-3 py-2.5 text-base focus:border-field";

export default function App() {
  const [species, setSpecies] = useState("Cattle");
  const [age, setAge] = useState("");
  const [duration, setDuration] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function onPickFiles(e) {
    const files = Array.from(e.target.files || []).slice(0, 3 - images.length);
    try {
      const processed = await Promise.all(files.map((f) => fileToResizedBase64(f)));
      setImages((prev) => [...prev, ...processed].slice(0, 3));
    } catch (err) {
      setError(err.message);
    }
    e.target.value = "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          species,
          age,
          duration,
          symptoms,
          images: images.map(({ media_type, data }) => ({ media_type, data })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setResult(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/15 bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between px-5 py-4">
          <h1 className="font-display text-xl font-bold">Livestock Health AI</h1>
          <p className="hidden text-sm text-paper/70 sm:block">First-look triage for farmers</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,26rem)_1fr]">
        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight">
              What is wrong with the animal?
            </h2>
            <p className="mt-2 max-w-prose text-ink/70">
              Describe what you see and add photos. You get a likely cause, how urgent it is, and what to do next.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Animal</span>
              <select value={species} onChange={(e) => setSpecies(e.target.value)} className={inputCls}>
                {SPECIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Age</span>
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 3 years"
                className={inputCls}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Symptoms</span>
            <textarea
              required
              rows={5}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Not eating since morning, drooling, limping on the front left leg, blisters near the mouth..."
              className={inputCls}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">When did it start?</span>
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 2 days ago"
              className={inputCls}
            />
          </label>

          <div>
            <span className="mb-1 block text-sm font-semibold">Photos (up to 3)</span>
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative h-24 w-24 overflow-hidden rounded-md border border-ink/20">
                  <img src={img.preview} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-sm text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-md border-2 border-dashed border-field/50 text-center text-sm font-medium text-field hover:bg-mist">
                  Add photo
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={onPickFiles} />
                </label>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || symptoms.trim().length < 5}
            className="w-full rounded-md bg-field px-4 py-3 text-base font-semibold text-white transition hover:bg-field/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Check health"}
          </button>

          {error && (
            <p role="alert" className="rounded-md border border-alarm/40 bg-alarm/10 px-3 py-2 text-sm text-alarm">
              {error}
            </p>
          )}
        </form>

        {/* Result */}
        <section aria-live="polite" className="min-w-0">
          {!result && !loading && (
            <div className="grid h-full min-h-64 place-items-center rounded-lg border-2 border-dashed border-ink/20 p-8 text-center text-ink/60">
              Your assessment will appear here.
            </div>
          )}

          {loading && (
            <div className="space-y-3" aria-label="Loading result">
              <div className="h-16 animate-pulse rounded-lg bg-mist" />
              <div className="h-28 animate-pulse rounded-lg bg-mist" />
              <div className="h-28 animate-pulse rounded-lg bg-mist" />
            </div>
          )}

          {result && <Result data={result} />}
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-10 text-sm text-ink/60">
        This tool gives general guidance only. It does not replace a veterinarian. For a sick animal, contact a vet.
      </footer>
    </div>
  );
}

function Result({ data }) {
  const u = URGENCY[data.urgency] || URGENCY.monitor;
  return (
    <div className="space-y-6">
      <div className={`rounded-lg px-5 py-4 ${u.cls}`}>
        <p className="font-display text-xl font-bold">{u.label}</p>
        <p className="mt-1 opacity-90">{data.summary}</p>
      </div>

      {(data.isolate || data.possibly_notifiable) && (
        <ul className="space-y-2">
          {data.isolate && (
            <li className="rounded-md border border-hay bg-hay/15 px-4 py-2.5 font-medium">
              Separate this animal from the rest of the herd until a vet has seen it.
            </li>
          )}
          {data.possibly_notifiable && (
            <li className="rounded-md border border-alarm bg-alarm/10 px-4 py-2.5 font-medium">
              These signs can match a reportable disease. Contact your local veterinary authority.
            </li>
          )}
        </ul>
      )}

      <Block title="Possible conditions">
        <ul className="space-y-3">
          {(data.conditions || []).map((c, i) => (
            <li key={i} className={`rounded-md border border-ink/10 border-l-4 bg-white p-4 ${LIKELIHOOD[c.likelihood] || ""}`}>
              <p className="font-semibold">
                {c.name} <span className="font-normal text-ink/60">({c.likelihood} likelihood)</span>
              </p>
              <p className="mt-1 text-ink/80">{c.why}</p>
            </li>
          ))}
        </ul>
      </Block>

      {data.visible_signs?.length > 0 && (
        <Block title="What the photos show">
          <List items={data.visible_signs} />
        </Block>
      )}

      <Block title="Do now">
        <List items={data.immediate_actions} />
      </Block>

      <Block title="Tell the vet">
        <List items={data.vet_questions} />
      </Block>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div>
      <h3 className="mb-2 font-display text-lg font-bold">{title}</h3>
      {children}
    </div>
  );
}

function List({ items = [] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-field">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}
