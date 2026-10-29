// Who is in front of whom: the lower on the screen (closer to you), the more in front.
// The character, his friends, the visitors, the ball: all share this rule, so they pass in front of and behind each other.
export const depthZ = (feetY: number) => 40 + Math.round(Math.max(0, Math.min(1200, feetY)) / 40);
