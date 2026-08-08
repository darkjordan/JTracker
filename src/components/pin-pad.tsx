"use client";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

// Controlled 4-digit PIN entry: dot progress indicator + on-screen keypad
// (avoids the OS keyboard so the PIN never touches an IME/clipboard).
export default function PinPad({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  function press(k: string) {
    if (k === "⌫") {
      onChange(value.slice(0, -1));
    } else if (k && value.length < 4) {
      onChange(value + k);
    }
  }

  return (
    <div>
      <div
        className="flex justify-center gap-3"
        role="status"
        aria-label={`${value.length} of 4 digits entered`}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${
              i < value.length
                ? error
                  ? "border-red-500 bg-red-500"
                  : "border-indigo-600 bg-indigo-600"
                : "border-gray-300"
            }`}
          />
        ))}
      </div>

      <div className="mx-auto mt-6 grid max-w-[280px] grid-cols-3 gap-3">
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "⌫" ? "Backspace" : `Digit ${k}`}
              className="rounded-2xl bg-white py-4 text-xl font-semibold text-gray-800 shadow-sm ring-1 ring-black/5 active:bg-gray-100"
            >
              {k}
            </button>
          )
        )}
      </div>
    </div>
  );
}
