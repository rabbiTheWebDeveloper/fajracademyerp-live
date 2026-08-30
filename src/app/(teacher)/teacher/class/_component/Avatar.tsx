import React from "react";

export function Avatar({
  name,
  src,
  size = "md",
}: {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sz =
    size === "sm"
      ? "w-8 h-8 text-xs"
      : size === "lg"
      ? "w-14 h-14 text-xl"
      : "w-10 h-10 text-sm";

  if (src) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={`${sz} rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sz} rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center font-bold border-2 border-white shadow-sm flex-shrink-0`}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}
