const Duty = require("../../models/Duty");
const {
  resolveAssignments,
  nextStartingIndex,
} = require("../../utils/dutyAssignment");

module.exports = (agenda) => {
  agenda.define("increment duty currentIndex", async () => {
    try {
      const dutyDocs = await Duty.find();

      const updatePromises = dutyDocs.map(async (duty) => {
        const members = duty.memberOrder || [];
        const docs = duty.duties || [];

        if (members.length === 0 || docs.length === 0) return;

        // Step 1: Advance the rotation by one member
        const nextIndex = nextStartingIndex(
          duty.currentStartingMemberIndex,
          members.length
        );

        // Step 2: Re-assign duties for the new cycle. Skips only apply to the
        // cycle they were requested in, so they are cleared here.
        const assignments = resolveAssignments(docs, members, nextIndex, []);
        const updatedDocs = docs.map((doc, i) => ({
          ...doc.toObject(),
          assignedTo: assignments[i],
        }));

        // Step 3: Save updates
        return Duty.updateOne(
          { _id: duty._id },
          {
            $set: {
              currentStartingMemberIndex: nextIndex,
              duties: updatedDocs,
              skippedMembersForCurrentCycle: [],
            },
          }
        );
      });

      await Promise.all(updatePromises);
      console.log(
        `[Agenda] Rotated duties for ${dutyDocs.length} room(s) and cleared skips.`
      );
    } catch (error) {
      console.error("[Agenda] Error updating assignedTo fields:", error);
    }
  });
};
