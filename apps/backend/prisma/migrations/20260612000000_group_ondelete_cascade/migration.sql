-- Clean up all references automatically when a Group is deleted.
-- See ROADMAP-admin.md: "Få onDelete-cascade att fungera som avsett för relationerna".

-- LayerInstance.groupId: SetNull (default for optional relation) -> Cascade.
-- A group's layer instances represent its layer composition and are meaningless
-- without the group, so they are removed together with the group.
ALTER TABLE "LayerInstance" DROP CONSTRAINT "LayerInstance_groupId_fkey";
ALTER TABLE "LayerInstance" ADD CONSTRAINT "LayerInstance_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GroupsOnMaps.groupId: Restrict (default for required relation) -> Cascade.
-- Removing a group removes its placements on every map.
ALTER TABLE "GroupsOnMaps" DROP CONSTRAINT "GroupsOnMaps_groupId_fkey";
ALTER TABLE "GroupsOnMaps" ADD CONSTRAINT "GroupsOnMaps_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GroupsOnMaps.parentGroupId (self-reference): SetNull -> Cascade.
-- Deleting a placement removes its whole subtree of nested sub-group placements
-- so no orphaned nodes remain in the layer tree.
ALTER TABLE "GroupsOnMaps" DROP CONSTRAINT "GroupsOnMaps_parentGroupId_fkey";
ALTER TABLE "GroupsOnMaps" ADD CONSTRAINT "GroupsOnMaps_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "GroupsOnMaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
