// Shared duty-rotation logic, used by both the duty controller (when a member
// is skipped) and the nightly Agenda job (when the rotation advances).

const toId = (member) =>
  member && member._id ? member._id.toString() : String(member);

// Walks memberOrder circularly from startIndex, drops skipped members, and
// hands out the duties in order. If fewer members are eligible than there are
// duties, the order wraps and a member can take more than one duty.
const resolveAssignments = (
  duties,
  memberOrder,
  startIndex = 0,
  skippedIds = []
) => {
  if (!Array.isArray(duties) || !Array.isArray(memberOrder)) return [];
  if (duties.length === 0 || memberOrder.length === 0) {
    return duties.map(() => null);
  }

  const skipped = new Set(skippedIds.map(toId));
  const start =
    ((startIndex % memberOrder.length) + memberOrder.length) %
    memberOrder.length;

  const eligible = [];
  for (let i = 0; i < memberOrder.length; i++) {
    const member = memberOrder[(start + i) % memberOrder.length];
    if (!skipped.has(toId(member))) {
      eligible.push(toId(member));
    }
  }

  if (eligible.length === 0) return duties.map(() => null);

  return duties.map((_, i) => eligible[i % eligible.length]);
};

// The member index the next cycle should start from
const nextStartingIndex = (currentIndex, memberCount) => {
  if (!memberCount) return 0;
  return currentIndex >= memberCount - 1 ? 0 : currentIndex + 1;
};

module.exports = { resolveAssignments, nextStartingIndex, toId };
