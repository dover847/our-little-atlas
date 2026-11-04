import originals from "../data/activities.json";

export type Activity = {
  id: number;
  title: string;
  category: string;
  description: string;
};
export const activities: readonly Activity[] = originals;
export const categories = [
  ...new Set(activities.map((activity) => activity.category)),
];

export function filterActivities(
  query: string,
  category: string,
  favorites?: readonly number[],
) {
  const words = query.trim().toLocaleLowerCase();
  return activities.filter(
    (activity) =>
      (category === "all" || activity.category === category) &&
      (!favorites || favorites.includes(activity.id)) &&
      `${activity.title} ${activity.description} ${activity.category}`
        .toLocaleLowerCase()
        .includes(words),
  );
}

export function validateSelection(value: unknown): number[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > activities.length
  ) {
    throw new Error("Choose between 1 and 72 activities.");
  }
  if (
    value.some(
      (id) => !Number.isSafeInteger(id) || !activities.some((a) => a.id === id),
    )
  ) {
    throw new Error("Choose activities from this atlas.");
  }
  return [...new Set(value as number[])];
}

// The selected segment's midpoint lands at twelve o'clock after forward rotation.
export function landingRotation(
  previous: number,
  index: number,
  count: number,
) {
  if (!Number.isInteger(count) || count < 1 || index < 0 || index >= count)
    throw new Error("Invalid segment.");
  const target = (360 - ((index + 0.5) * 360) / count) % 360;
  const current = ((previous % 360) + 360) % 360;
  return previous + 4 * 360 + ((target - current + 360) % 360);
}
